import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    format: async () => "png", // force png
    public_id: (req, file) => {
      const nameWithoutExt = file.originalname.split(".")[0];
      return `${Date.now()}-${nameWithoutExt}`;
    },
  },
});

const upload = multer({ storage });

export default upload;