document
  .getElementById("imageForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const imageInput = document.getElementById("imageInput");
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");

    const formData = new FormData();
    formData.append("image", imageInput.files[0]);
    formData.append("title", titleInput.value);
    formData.append("description", descriptionInput.value);

    // Enviar la imagen al servidor para que sea procesada
    fetch("/.netlify/functions/generatepost", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        // Mostrar la imagen generada en el frontend
        const imageUrl = data.imageUrl;
        document.getElementById("generatedImage").src = imageUrl;
        document.getElementById("generatedImage").style.display = "block";

        // Habilitar el enlace de descarga para la imagen generada
        document.getElementById("downloadLink").href = imageUrl;
        document.getElementById("downloadLink").style.display = "block";

        // Mostrar el botón de enviar webhook
        document.getElementById("sendWebhookBtn").style.display = "block";

        // Guardar la URL de la imagen generada para el webhook
        const generatedImageUrl = imageUrl;
        const finalImagePath = data.finalImagePath; // Ruta completa de la imagen

        // Enviar los datos al webhook cuando el usuario haga clic en el botón
        document
          .getElementById("sendWebhookBtn")
          .addEventListener("click", function () {
            const webhookData = {
              title: titleInput.value,
              description: descriptionInput.value,
              imageUrl: generatedImageUrl, // URL de la imagen generada (local)
              finalImagePath: finalImagePath, // Ruta completa de la imagen para subirla a Google Drive
            };

            // Enviar los datos del webhook
            fetch("/sendWebhook", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(webhookData),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("Webhook enviado con éxito", data);
              })
              .catch((error) => {
                console.error("Error al enviar el webhook:", error);
              });
          });
      })
      .catch((error) => {
        console.error("Error al procesar la imagen:", error);
      });
  });

document
  .getElementById("imageForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const imageInput = document.getElementById("imageInput"); // Input de tipo file

    const title = titleInput.value;
    const description = descriptionInput.value;

    const file = imageInput.files[0]; // Obtiene el archivo seleccionado

    // Convierte el archivo a una URL de datos
    const reader = new FileReader();
    reader.onloadend = function () {
      const imageUrl = reader.result; // Obtiene la URL de datos

      // Enviar la URL de la imagen al servidor para que sea procesada
      fetch("/.netlify/functions/generate_post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title, imageUrl: imageUrl }), // Enviar la URL de datos
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            console.error("Error al procesar la imagen:", data.error);
            document.getElementById("errorMessage").textContent = data.error;
            document.getElementById("errorMessage").style.display = "block";
          } else {
            document.getElementById("errorMessage").style.display = "none";
            const imageBase64 = data.image;
            const processedImageUrl = `data:image/png;base64,${imageBase64}`;
            document.getElementById("generatedImage").src = processedImageUrl;
            document.getElementById("generatedImage").style.display = "block";

            document.getElementById("downloadLink").href = processedImageUrl;
            document.getElementById("downloadLink").style.display = "block";

            document.getElementById("sendWebhookBtn").style.display = "block";

            // Asignar la función al onclick del botón (CORREGIDO)
            document.getElementById("sendWebhookBtn").onclick = function () {
              const webhookData = {
                title: titleInput.value,
                description: descriptionInput.value,
                imageUrl: imageUrl, // Usar la URL de datos original
                image: imageBase64, // Enviar la imagen en base64
              };

              // Enviar los datos al webhook
              fetch("/.netlify/functions/send_webhook", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(webhookData),
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.error) {
                    console.error("Error al enviar el webhook:", data.error);
                    document.getElementById("errorMessage").textContent =
                      "Error al enviar el webhook: " + data.error;
                    document.getElementById("errorMessage").style.display =
                      "block";
                  } else {
                    console.log("Webhook enviado con éxito", data);
                    document.getElementById("successMessage").textContent =
                      "Webhook enviado con éxito";
                    document.getElementById("successMessage").style.display =
                      "block";
                  }
                })
                .catch((error) => {
                  console.error("Error al enviar el webhook:", error);
                  document.getElementById("errorMessage").textContent =
                    "Error al enviar el webhook: " + error.message;
                  document.getElementById("errorMessage").style.display =
                    "block";
                });
            };
          }
        })
        .catch((error) => {
          console.error("Error al procesar la imagen:", error);
          document.getElementById("errorMessage").textContent =
            "Error al procesar la imagen: " + error.message;
          document.getElementById("errorMessage").style.display = "block";
        });
    };
    reader.readAsDataURL(file); // Lee el archivo como una URL de datos
  });
