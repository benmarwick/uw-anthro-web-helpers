/* ---------- The TA's time sheet ----------
   The TA uploads a time sheet (or a short document explaining why they have none) with their response.
   The file is saved in a subfolder of the archive folder. The instructor downloads it at sign-off
   through the web app, so the file is never shared in Drive. */

const TIMESHEET_MAX_BYTES_ = 5 * 1024 * 1024;   // 5 MB
const TIMESHEET_FOLDER_NAME_ = 'Time sheets';
const TIMESHEET_RATE_LIMIT_ = 30;              // downloads per account per hour

/* Allowed file types. The first bytes of the file must match, whatever the browser says it is.
   .docx and .xlsx files are zip files, so they start with the same bytes. */
const TIMESHEET_TYPES_ = {
  pdf:  { mimeType: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  png:  { mimeType: 'image/png', magic: [0x89, 0x50, 0x4E, 0x47] },
  jpg:  { mimeType: 'image/jpeg', magic: [0xFF, 0xD8, 0xFF] },
  jpeg: { mimeType: 'image/jpeg', magic: [0xFF, 0xD8, 0xFF] },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [0x50, 0x4B, 0x03, 0x04] },
  xlsx: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: [0x50, 0x4B, 0x03, 0x04] }
};

const TIMESHEET_MISSING_ = 'Upload your time sheet, or a short document explaining why you do not have one.';
const TIMESHEET_BAD_TYPE_ = 'The time sheet must be a PDF, PNG, JPG, Word (.docx) or Excel (.xlsx) file.';
const TIMESHEET_TOO_BIG_ = 'The time sheet file is larger than 5 MB. Please upload a smaller file.';

/* The lower-case extension of a file name, or ''. */
function fileExtension_(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

/* True when the bytes start with the magic bytes. Apps Script bytes are signed (-128..127). */
function startsWithBytes_(bytes, magic) {
  if (!bytes || bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if ((bytes[i] & 0xFF) !== magic[i]) return false;
  }
  return true;
}

/* Checks the uploaded file: { name, data } where data is base64.
   Returns { bytes, ext, mimeType, originalName } or { error }. */
function checkTimesheetFile_(file) {
  if (!file || typeof file !== 'object' || typeof file.data !== 'string' || !file.data) {
    return { error: TIMESHEET_MISSING_ };
  }
  const ext = fileExtension_(file.name);
  const type = TIMESHEET_TYPES_[ext];
  if (!type) return { error: TIMESHEET_BAD_TYPE_ };

  // Base64 is 4 characters for every 3 bytes, so a long string is refused before decoding it.
  const maxChars = Math.ceil(TIMESHEET_MAX_BYTES_ / 3) * 4 + 4;
  if (file.data.length > maxChars) return { error: TIMESHEET_TOO_BIG_ };

  let bytes;
  try {
    bytes = Utilities.base64Decode(file.data);
  } catch (e) {
    return { error: TIMESHEET_BAD_TYPE_ };
  }
  if (!bytes.length) return { error: TIMESHEET_MISSING_ };
  if (bytes.length > TIMESHEET_MAX_BYTES_) return { error: TIMESHEET_TOO_BIG_ };
  if (!startsWithBytes_(bytes, type.magic)) return { error: TIMESHEET_BAD_TYPE_ };

  const originalName = sanitizeInput_(file.name, { maxLength: 200, allowNewlines: false });
  return { bytes: bytes, ext: ext, mimeType: type.mimeType, originalName: originalName };
}

/* The "Time sheets" folder inside the archive folder, created the first time it is needed. */
function timesheetFolder_() {
  const archive = DriveApp.getFolderById(C_().ARCHIVE_FOLDER_ID);
  const existing = archive.getFoldersByName(TIMESHEET_FOLDER_NAME_);
  if (existing.hasNext()) return existing.next();
  return archive.createFolder(TIMESHEET_FOLDER_NAME_);
}

/* A file name made on the server: Timesheet_<EvalID>_<Course>_<TA>.<ext> */
function timesheetFileName_(row, ext) {
  const safeId = String(row.evaluationId || '').replace(/[^a-zA-Z0-9-]/g, '_');
  const safeCourse = String(row.courseCode || '').replace(/[^a-zA-Z0-9]/g, '_');
  const safeTa = String(row.taName || '').replace(/[^a-zA-Z0-9]/g, '_');
  return 'Timesheet_' + safeId + '_' + safeCourse + '_' + safeTa + '.' + ext;
}

/* Saves a checked file to Drive. Returns the payload fields that record it. */
function saveTimesheet_(row, checked) {
  const fileName = timesheetFileName_(row, checked.ext);
  const blob = Utilities.newBlob(checked.bytes, checked.mimeType, fileName);
  const file = timesheetFolder_().createFile(blob);
  return {
    timesheetFileId: file.getId(),
    timesheetFileName: fileName,
    timesheetOriginalName: checked.originalName,
    timesheetUploadedAt: new Date().toISOString()
  };
}

/* Moves an uploaded file to the trash, for a submission that did not go through. */
function trashTimesheet_(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
  } catch (err) {
    logWarn_('Timesheet.trashTimesheet', 'Could not delete an unused time sheet', { fileId: fileId, error: err.message });
  }
}

/* Called from the instructor's sign-off page with google.script.run.
   Returns { success, name, mimeType, data (base64) } or { success: false, error }. */
function getTimesheetForSignoff(token) {
  const pre = precheckCaller_(token, 'timesheet', TIMESHEET_RATE_LIMIT_);
  if (pre.error) return { success: false, error: pre.error };
  try {
    const ctx = loadAuthorizedRow_(token, 'prof_sign');
    if (ctx.error) return { success: false, error: ctx.error };
    const fileId = ctx.row.dataPayload.timesheetFileId;
    if (!fileId) return { success: false, error: 'No time sheet was uploaded for this evaluation.' };

    let blob;
    try {
      const file = DriveApp.getFileById(fileId);
      if (file.isTrashed()) throw new Error('trashed');
      blob = file.getBlob();
    } catch (e) {
      return { success: false, error: 'The time sheet file could not be found. Contact the coordinator.' };
    }
    return {
      success: true,
      name: ctx.row.dataPayload.timesheetFileName || blob.getName(),
      mimeType: blob.getContentType(),
      data: Utilities.base64Encode(blob.getBytes())
    };
  } catch (err) {
    logError_('Timesheet.getTimesheetForSignoff', err.message, { stack: err.stack });
    return { success: false, error: GENERIC_ERROR_ };
  }
}
