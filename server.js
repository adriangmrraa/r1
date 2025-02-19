import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createCanvas, loadImage, registerFont } from "canvas";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { google } from "googleapis";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// Este es un comentario para forzar un nuevo despliegue en Netlify

// Este es un comentario para forzar un nuevo despliegue en Netlify

// comentarionuevo forzar depspliegue

// Configuración para obtener el directorio actual en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: "uploads/" });
const port = 3000;

// Configurar el middleware para parsear JSON
app.use(express.json());
app.use(express.static("public"));
app.use("/output", express.static(path.join(__dirname, "output"))); // Hacemos que el directorio 'output' sea accesible

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
    ); // Importante: Reemplaza los saltos de línea escapados

  if (!client_email || !private_key) {
    console.error("Error: Missing Google credentials in .env file.");
    throw new Error("Missing Google credentials in .env file.");
  }

  const auth = new google.auth.JWT(client_email, null, private_key, SCOPES);
  return auth;
}

// Subir archivo a Google Drive
// Subir archivo a Google Drive
async function uploadFile(auth, filePath) {
  const drive = google.drive({ version: "v3", auth });

  // Metadatos del archivo a subir
  const fileMetadata = {
    name: path.basename(filePath), // Nombre del archivo subido
    parents: [FOLDER_ID], // ID de la carpeta en Google Drive donde se subirá el archivo
  };

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
    return response.data.webContentLink; // Devuelve el enlace para acceder a la imagen
  } catch (error) {
    console.error("Error al subir el archivo:", error.message);
    throw error;
  }
}

// Procesamiento de la imagen (Sharp + Canvas)
async function processImage(imagePath, title, logoPath) {
  console.log("Iniciando el procesamiento de la imagen...");

  const uniqueId = uuidv4();
  const resizedImagePath = path.join(
    __dirname,
    "output", // Asegúrate de que "output" sea el directorio correcto
    `resized_${uniqueId}.jpg`
  );
  const finalImagePath = path.join(
    __dirname,
    "output",
    `final_${uniqueId}.jpg`
  );

  // Redimensionamos la imagen original con Sharp
  console.log("Redimensionando imagen con Sharp...");
  await sharp(imagePath).resize(1080, 1080).toFile(resizedImagePath);

  // Cargamos la imagen redimensionada en Canvas
  console.log("Cargando imagen en Canvas...");
  const image = await loadImage(resizedImagePath);
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
  registerFont(
    "C:\\Users\\adria\\AppData\\Local\\Microsoft\\Windows\\Fonts\\BebasKai.ttf",
    { family: "Bebas Kai" }
  );
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
  const logo = await loadImage(logoPath);
  const logoWidth = 150;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  ctx.drawImage(logo, 1080 - logoWidth - 10, 10, logoWidth, logoHeight);

  // Guarda la imagen final procesada
  console.log("Guardando la imagen final procesada...");
  const buffer = canvas.toBuffer("image/png");
  await fs.promises.writeFile(finalImagePath, buffer);

  // Elimina la imagen redimensionada temporal
  fs.unlinkSync(resizedImagePath);

  console.log("Imagen final guardada en:", finalImagePath);

  // Regresa la URL local para la visualización y la ruta completa para la subida al drive
  return {
    imageLocalUrl: `/output/final_${uniqueId}.jpg`, // URL local para visualización
    finalImagePath, // Ruta completa para la subida al drive
  };
}

// Endpoint para procesar la imagen y subirla a Google Drive
app.post("/generate", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;
  const imagePath = req.file.path;
  const logoPath = path.join(__dirname, "logo.png"); // Asegúrate de tener el logo

  try {
    // Procesar la imagen
    const { imageLocalUrl, finalImagePath } = await processImage(
      imagePath,
      title,
      logoPath
    );

    // Responder con la URL local para visualización
    res.json({
      imageUrl: imageLocalUrl, // URL local para visualización en frontend
      title,
      description,
      finalImagePath, // Ruta completa para la subida a Google Drive
    });
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
    res.status(500).send("Error al procesar la imagen");
  }
});

// Enviar los datos al webhook
async function sendToWebhook(note) {
  try {
    console.log("Enviando datos al webhook...");
    const webhookUrl =
      "https://hook.us2.make.com/ddq3tpa95g6te33z2xiwopk1j912zcs3"; // Coloca aquí tu URL del webhook
    await axios.post(webhookUrl, {
      title: note.title,
      datePublished: note.datePublished,
      content: note.content,
      imageUrl: note.imageUrl, // Esta es la URL de la imagen procesada (puede ser de Google Drive)
      linkUrl: note.linkUrl, // Usamos la misma URL para el link (puedes cambiar esto si necesitas un enlace diferente)
      imageDriveUrl: note.imageDriveUrl, // Enlace de la imagen en Google Drive
    });
    console.log("Webhook enviado con éxito para la noticia:", note.title);
  } catch (error) {
    console.error("Error enviando datos al webhook:", error);
  }
}

// Endpoint para enviar el webhook
app.post("/sendWebhook", async (req, res) => {
  const { title, description, imageUrl, finalImagePath } = req.body;

  // Verificar si finalImagePath está correctamente recibido
  if (!finalImagePath) {
    console.error("Error: finalImagePath is missing in the request.");
    return res.status(400).json({ error: "finalImagePath is required." });
  }

  try {
    // Subir la imagen a Google Drive
    const auth = await authorize();
    const imageDriveUrl = await uploadFile(auth, finalImagePath);

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

    res.json({
      success: true,
      message: "Webhook enviado con éxito.",
    });
  } catch (error) {
    console.error("Error al enviar el webhook:", error);
    res.status(500).send("Error al enviar el webhook.");
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
