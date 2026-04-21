const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const MaintenanceTask = require('../models/MaintenanceTask');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const Status = require('../models/Status');
const { protect, requirePermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Other'];
const STATUS_ALIASES = {
  overdue: 'Overdue',
  pending: 'Pending',
  done: 'Done',
  verified: 'Verified',
  cancelled: 'Cancelled',
  cancel: 'Cancelled',
  inprogress: 'In Progress',
  'in progress': 'In Progress',
};

function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(s) {
  return clean(String(s || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseDate(raw) {
  if (!raw) return null;
  const s = clean(raw).replace(/\./g, '-').replace(/\//g, '-');
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmmyyyy = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmmyyyy) {
    const [, d, mon, y] = dmmyyyy;
    const parsed = new Date(`${d} ${mon} ${y}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function detectFrequency(text) {
  const lower = text.toLowerCase();
  const match = FREQUENCIES.find((f) => lower.includes(f.toLowerCase()));
  return match || 'Other';
}

function detectStatus(text) {
  const lower = text.toLowerCase();
  const keys = Object.keys(STATUS_ALIASES).sort((a, b) => b.length - a.length);
  const found = keys.find((k) => lower.includes(k));
  return found ? STATUS_ALIASES[found] : 'Pending';
}

function extractDates(text) {
  const dateMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}-[A-Za-z]{3}-\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];
  const parsed = dateMatches.map(parseDate).filter(Boolean);
  return {
    start_date: parsed[0] || null,
    last_done: parsed[1] || null,
    next_due: parsed[2] || parsed[1] || null,
    rawDates: dateMatches,
  };
}

function parseRowsFromOCR(ocrText) {
  const lines = ocrText
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    const idMatch = line.match(/\bM\d{3,4}\b/i);
    if (!idMatch) continue;
    const task_code = idMatch[0].toUpperCase();
    const frequency = detectFrequency(line);
    const status_name = detectStatus(line);
    const { start_date, last_done, next_due } = extractDates(line);

    // Heuristic cleanup: remove the id, dates, frequency and status keywords to derive the "description-ish" text.
    let remainder = line.replace(task_code, ' ');
    remainder = remainder.replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}-[A-Za-z]{3}-\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ');
    remainder = remainder.replace(new RegExp(frequency, 'ig'), ' ');
    remainder = remainder.replace(/overdue|pending|done|verified|cancelled|in progress|inprogress/ig, ' ');
    const description = clean(remainder).slice(0, 220);

    rows.push({
      task_code,
      maintenance_reference: task_code,
      maintenance_description: description || 'Imported from image',
      equipment_name: '',
      assigned_name: '',
      frequency,
      start_date: start_date ? start_date.toISOString().slice(0, 10) : '',
      last_done: last_done ? last_done.toISOString().slice(0, 10) : '',
      next_due: next_due ? next_due.toISOString().slice(0, 10) : '',
      status_name,
      priority: 'Medium',
      remarks: 'Imported from maintenance image',
      source_line: line,
    });
  }

  // Dedupe by task_code, keep first.
  const seen = new Set();
  return rows.filter((r) => {
    if (seen.has(r.task_code)) return false;
    seen.add(r.task_code);
    return true;
  });
}

function excelDateToJSDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  return parseDate(String(value));
}

function parseRowsFromXlsxBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const pick = (obj, aliases) => {
    const normalizedMap = new Map(
      Object.entries(obj).map(([k, v]) => [normalizeHeader(k), v])
    );
    for (const key of aliases) {
      if (normalizedMap.has(key)) return normalizedMap.get(key);
    }
    return '';
  };

  const parsed = rows
    .map((raw, idx) => {
      const taskCode = clean(
        pick(raw, ['task id', 'taskid', 'task code', 'id', 'maintenance id']) || `XLSX-${idx + 1}`
      ).toUpperCase();
      const ref = clean(
        pick(raw, ['reference', 'maintenance reference', 'reference no', 'reference number'])
      );
      const desc = clean(
        pick(raw, ['maintenance activity', 'description', 'activity', 'task', 'maintenance description'])
      );
      const equipmentName = clean(
        pick(raw, ['equipment', 'equipment asset', 'asset', 'equipment name'])
      );
      const assignedName = clean(
        pick(raw, ['assigned to', 'assignee', 'owner', 'technician'])
      );
      const frequencyRaw = clean(pick(raw, ['frequency']));
      const statusRaw = clean(pick(raw, ['status']));
      const priorityRaw = clean(pick(raw, ['priority']));
      const remarksRaw = clean(pick(raw, ['remarks', 'note', 'notes']));

      const start = excelDateToJSDate(pick(raw, ['start date', 'start']));
      const lastDone = excelDateToJSDate(pick(raw, ['last done', 'completed date']));
      const nextDue = excelDateToJSDate(pick(raw, ['next due', 'due date', 'next due date']));

      return {
        task_code: taskCode,
        maintenance_reference: ref || taskCode,
        maintenance_description: desc || 'Imported from XLSX',
        equipment_name: equipmentName,
        assigned_name: assignedName,
        frequency: FREQUENCIES.includes(frequencyRaw) ? frequencyRaw : detectFrequency(frequencyRaw || desc || ''),
        start_date: start ? start.toISOString().slice(0, 10) : '',
        last_done: lastDone ? lastDone.toISOString().slice(0, 10) : '',
        next_due: nextDue ? nextDue.toISOString().slice(0, 10) : '',
        status_name: statusRaw ? detectStatus(statusRaw) : 'Pending',
        priority: ['Critical', 'High', 'Medium', 'Low'].includes(priorityRaw) ? priorityRaw : 'Medium',
        remarks: remarksRaw || 'Imported from XLSX',
      };
    })
    .filter((r) => r.task_code || r.maintenance_description);

  const seen = new Set();
  return parsed.filter((r) => {
    const key = r.task_code || `${r.maintenance_reference}-${r.next_due}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

router.post('/tasks/ocr-preview', protect, requirePermission(P.TASKS_CREATE), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });

    const ocr = await Tesseract.recognize(req.file.buffer, 'eng');
    const text = ocr?.data?.text || '';
    const parsedRows = parseRowsFromOCR(text);

    res.json({
      parsedCount: parsedRows.length,
      rows: parsedRows,
      rawText: text.slice(0, 4000),
      note: 'OCR parsing is heuristic. Review and correct rows before import.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to process image' });
  }
});

router.post('/tasks/xlsx-preview', protect, requirePermission(P.TASKS_CREATE), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'XLSX file is required' });
    const parsedRows = parseRowsFromXlsxBuffer(req.file.buffer);
    res.json({
      parsedCount: parsedRows.length,
      rows: parsedRows,
      note: 'Excel rows parsed by header mapping. Review and correct before import.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to process xlsx file' });
  }
});

router.post('/tasks/commit', protect, requirePermission(P.TASKS_CREATE), async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ message: 'No rows provided' });

    const statuses = await Status.find();
    const statusByName = new Map(statuses.map((s) => [s.status_name.toLowerCase(), s]));

    const equipment = await Equipment.find({ is_active: true });
    const equipmentByName = new Map(equipment.map((e) => [e.equipment_name.toLowerCase(), e]));

    const users = await User.find({ is_active: true }).select('name');
    const userByName = new Map(users.map((u) => [u.name.toLowerCase(), u]));

    const defaultPending = statusByName.get('pending') || statuses[0];
    if (!defaultPending) return res.status(400).json({ message: 'No statuses configured in system' });

    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      try {
        const statusName = clean(row.status_name).toLowerCase();
        const status = statusByName.get(statusName) || defaultPending;
        const equipmentDoc = equipmentByName.get(clean(row.equipment_name).toLowerCase());
        const userDoc = userByName.get(clean(row.assigned_name).toLowerCase());
        const frequency = FREQUENCIES.includes(row.frequency) ? row.frequency : 'Other';

        const payload = {
          task_code: clean(row.task_code) || undefined,
          maintenance_reference: clean(row.maintenance_reference) || clean(row.task_code) || `IMP-${Date.now()}-${i + 1}`,
          maintenance_description: clean(row.maintenance_description) || 'Imported from image',
          frequency,
          status_id: status._id,
          priority: ['Critical', 'High', 'Medium', 'Low'].includes(row.priority) ? row.priority : 'Medium',
          remarks: clean(row.remarks),
        };

        const startDate = parseDate(row.start_date);
        const lastDone = parseDate(row.last_done);
        const nextDue = parseDate(row.next_due);

        if (startDate) payload.start_date = startDate;
        if (lastDone) payload.last_done = lastDone;
        if (nextDue) payload.next_due = nextDue;
        if (equipmentDoc) payload.equipment_id = equipmentDoc._id;
        if (userDoc) payload.assigned_to = userDoc._id;

        const doc = await MaintenanceTask.create(payload);
        created.push(doc._id);
      } catch (err) {
        errors.push({ index: i, task_code: row.task_code || '', error: err.message });
      }
    }

    res.json({
      createdCount: created.length,
      errorCount: errors.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to import rows' });
  }
});

module.exports = router;
