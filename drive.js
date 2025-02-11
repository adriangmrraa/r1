import fs from "fs";
import { google } from "googleapis";

// Definir los permisos necesarios
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const CREDENTIALS_PATH = "spheric-backup-295500-8db588732c5f.json";
const FOLDER_ID = "14czRVH40skE-hnv9G4nF1p0iEOm-g0nK"; // Reemplaza con el ID de la carpeta de destino en Drive

// Autorizar la API de Google
async function authorize() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);

  const { client_email, private_key } = credentials;
  const auth = new google.auth.JWT(client_email, null, private_key, SCOPES);

  return auth;
}

// Subir archivo a Google Drive
async function uploadFile(auth) {
  const drive = google.drive({ version: "v3", auth });

  // Metadatos del archivo a subir
  const fileMetadata = {
    name: "test_image.jpg", // El nombre del archivo que quieres subir
    parents: [FOLDER_ID], // ID de la carpeta en Google Drive donde se subirá el archivo
  };

  // Ruta del archivo local que quieres subir
  const filePath = "logo.png"; // Reemplaza con la ruta del archivo que quieres subir

  const media = {
    mimeType: "image/png", // Cambia el mimeType si subes otro tipo de archivo
    body: fs.createReadStream(filePath),
  };

  try {
    // Subir el archivo
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webContentLink",
    });

    console.log("Archivo subido con éxito");
    console.log("ID del archivo:", response.data.id);
    console.log("Enlace para ver el archivo:", response.data.webContentLink);
  } catch (error) {
    console.error("Error al subir el archivo:", error.message);
  }
}

// Ejecutar el proceso de carga
authorize()
  .then((auth) => uploadFile(auth))
  .catch((err) => {
    console.error("Error de autenticación:", err.message);
  });
