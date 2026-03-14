import multer from "multer";
import fs from "fs";
import path from "path";
const uploadDir = path.join(process.cwd(), "src/upload");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = `${Date.now()}`;
    const filename = file.originalname;
    const ext = path.extname(filename);
    cb(null, `${timestamp}${ext}`);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowType = /jpeg|png|gif|jpg/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowType.test(ext)) {
      cb(new Error(`Only Images Allows`), false);
    }
    cb(null,true);
  },
});
export default upload;
