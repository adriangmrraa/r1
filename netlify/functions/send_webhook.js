// netlify/functions/send_webhook.js
import { google } from "googleapis";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
dotenv.config();

// Definir los permisos necesarios y las credenciales de Google
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const FOLDER_ID = "14czRVH40skE-hnv9G4nF1p0iEOm-g0nK"; // Reemplaza con el ID de la carpeta de destino en Drive

// Autorizar la API de Google
async function authorize() {
  const client_email = process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL;
  const private_key =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY.replace(
      /\\n/g,
      "\n"
    );

  if (!client_email || !private_key) {
    console.error("Error: Missing Google credentials in .env file.");
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing Google credentials in .env file.",
      }),
    };
  }

  const auth = new google.auth.JWT(client_email, null, private_key, SCOPES);
  return auth;
}

// Subir archivo a Google Drive
async function uploadFile(auth, imageBuffer, imageName) {
  // Modificado: Recibe el buffer
  const drive = google.drive({ version: "v3", auth });

  // Metadatos del archivo a subir
  const fileMetadata = {
    name: imageName, // Usa el nombre proporcionado
    parents: [FOLDER_ID], // ID de la carpeta en Google Drive donde se subirá el archivo
  };

  const media = {
    mimeType: "image/png", // Cambia el mimeType si subes otro tipo de archivo
    body: imageBuffer, // Usa el buffer directamente
  };

  try {
    // Subir el archivo
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webContentLink",
    });

    console.log("Archivo subido con éxito");
    return response.data.webContentLink; // Devuelve el enlace para acceder a la imagen
  } catch (error) {
    console.error("Error al subir el archivo:", error.message);
    console.trace();
    throw error;
  }
}

// Enviar los datos al webhook
async function sendToWebhook(note) {
  try {
    console.log("Enviando datos al webhook...");
    const webhookUrl = process.env.WEBHOOK_URL; // Coloca aquí tu URL del webhook
    const response = await axios.post(webhookUrl, {
      title: note.title,
      datePublished: note.datePublished,
      content: note.content,
      imageUrl: note.imageUrl, // Esta es la URL de la imagen procesada (puede ser de Google Drive)
      linkUrl: note.linkUrl, // Usamos la misma URL para el link (puedes cambiar esto si necesitas un enlace diferente)
      imageDriveUrl: note.imageDriveUrl, // Enlace de la imagen en Google Drive
    });
    console.log(
      "Webhook enviado con éxito para la noticia:",
      note.title,
      "Status:",
      response.status
    );
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Error enviando datos al webhook:", error);
    console.trace();
    throw error; // Re-lanza el error para que se maneje en el endpoint
  }
}

export const handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method Not Allowed" }),
      };
    }

    // Extrae los datos del cuerpo de la solicitud
    const { title, description, imageUrl, image } = JSON.parse(event.body);

    // Genera un nombre único para la imagen
    const imageName = `${uuidv4()}.png`;

    // Convierte la imagen base64 a un buffer
    const imageBuffer = Buffer.from(image, "base64");

    // Autoriza la API de Google
    const auth = await authorize();

    // Sube la imagen a Google Drive
    const imageDriveUrl = await uploadFile(auth, imageBuffer, imageName);

    console.log("Imagen subida a Google Drive con éxito. URL: ", imageDriveUrl);

    // Preparar los datos del webhook
    const note = {
      title,
      datePublished: new Date().toISOString(),
      content: description,
      imageUrl,
      linkUrl: imageDriveUrl, // Usar la URL de Google Drive
      imageDriveUrl, // Enlace de la imagen en Google Drive
    };

    // Enviar el webhook
    await sendToWebhook(note);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Webhook enviado con éxito.",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
