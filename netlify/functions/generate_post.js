import { createCanvas, loadImage, registerFont } from "canvas";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs"; // Importa el módulo 'fs'
import { fileURLToPath } from "url";
import { dirname } from "path";
import { google } from "googleapis";
import axios from "axios";
import mime from "mime-types"; // Asegúrate de tener esta dependencia instalada
import * as dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  // Modificado: Recibe el buffer y el nombre
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

// Procesamiento de la imagen (Sharp + Canvas)
async function processImage(imageUrl, title, logoPath) {
  // Modificado: Recibe la URL de la imagen
  console.log("Iniciando el procesamiento de la imagen...");

  try {
    // Descarga la imagen desde la URL
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageResponse.data, "binary");
    console.log("Imagen descargada con éxito");
    // Redimensionamos la imagen original con Sharp
    console.log("Redimensionando imagen con Sharp...");
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(1080, 1080)
      .toBuffer();

    // Cargamos la imagen redimensionada en Canvas
    console.log("Cargando imagen en Canvas...");
    const image = await loadImage(resizedImageBuffer);
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext("2d");

    // Dibuja la imagen en el canvas
    console.log("Dibujando imagen en el canvas...");
    ctx.drawImage(image, 0, 0, 1080, 1080);

    // Crea un gradiente de abajo hacia arriba
    const gradient = ctx.createLinearGradient(0, 1080, 0, 270);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.9)"); // Parte oscura abajo
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)"); // Parte transparente arriba
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Configura la fuente y el estilo del texto
    console.log("Configurando la fuente...");
    registerFont(path.resolve(__dirname, "BebasKai.ttf"), {
      family: "Bebas Kai",
    }); // Fuente relativa
    ctx.font = 'bold 70px "Bebas Kai"';
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Divide el título en varias líneas si es necesario
    console.log("Dividiendo el título en líneas...");
    const maxWidth = 1080;
    const words = title.split(" ");
    let line = "";
    const lines = [];
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line.trim());
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    console.log("Título dividido en líneas:", lines);

    // Dibuja el texto en el canvas
    const yOffset = 1080 - lines.length * 80 - 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, yOffset - 20, 1080, lines.length * 60 + 40);
    ctx.fillStyle = "white";
    lines.forEach((line, index) => {
      ctx.fillText(line, 540, yOffset + index * 60);
    });

    // Agrega el texto adicional ("Radio Uno Formosa")
    ctx.font = 'bold 30px "Bebas Kai"';
    ctx.fillText("Radio Uno Formosa", 540, 1080 / 2);

    // Dibuja el logo en el canvas
    console.log("Agregando el logo al canvas...");
    const logo = await loadImage(path.resolve(__dirname, "logo.png")); // Logo relativo
    const logoWidth = 150;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    ctx.drawImage(logo, 1080 - logoWidth - 10, 10, logoWidth, logoHeight);

    // Guarda la imagen final procesada
    console.log("Convirtiendo la imagen final procesada a buffer...");
    const buffer = canvas.toBuffer("image/png");

    console.log("Buffer creado con éxito");

    // Regresa el buffer de la imagen final
    return {
      imageBuffer: buffer,
    };
  } catch (error) {
    console.error("Error en processImage:", error);
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
      datePublished: new Date().toISOString(),
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
    console.log("Función generate_post ejecutada");

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method Not Allowed" }),
      };
    }

    if (event.path === "/.netlify/functions/generate_post") {
      // Corregido
      console.log("Endpoint /generate_post llamado");
      const { title, imageUrl } = JSON.parse(event.body); // Recibe imageUrl en lugar de image
      console.log("Título:", title);
      console.log("URL de la imagen:", imageUrl);
      const logoPath = path.resolve(__dirname, "logo.png"); // Ruta relativa al logo

      console.log("Ruta del logo:", logoPath);

      // Procesa la imagen
      const { imageBuffer } = await processImage(imageUrl, title, logoPath);

      // Convierte el buffer a base64
      const imageBase64 = imageBuffer.toString("base64");

      console.log("Imagen procesada y convertida a base64");

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // ¡Cuidado en producción!
        },
        body: JSON.stringify({
          image: imageBase64, // Enviar la imagen en base64
        }),
      };
    }

    if (event.path === "/.netlify/functions/sendWebhook") {
      // Extrae los datos del cuerpo de la solicitud
      const { title, description, imageUrl, finalImagePath } = JSON.parse(
        event.body
      );

      // Verifica si finalImagePath está correctamente recibido
      if (!finalImagePath) {
        console.error("Error: finalImagePath is missing in the request.");
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "finalImagePath is required." }),
        };
      }

      try {
        // Subir la imagen a Google Drive
        const auth = await authorize();
        const imageDriveUrl = await uploadFile(auth, finalImagePath);

        console.log(
          "Imagen subida a Google Drive con éxito. URL: ",
          imageDriveUrl
        );

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
        console.error("Error al enviar el webhook:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Error al enviar el webhook." }),
        };
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Route not found" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
