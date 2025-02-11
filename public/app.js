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
    const imageUrlInput = document.getElementById("imageInput");

    const title = titleInput.value;
    const description = descriptionInput.value;
    const imageUrl = imageUrlInput.value;

    // Enviar la URL de la imagen al servidor para que sea procesada
    fetch("/.netlify/functions/generate_post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: title, imageUrl: imageUrl }),
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
          const imageUrl = `data:image/png;base64,${imageBase64}`;
          document.getElementById("generatedImage").src = imageUrl;
          document.getElementById("generatedImage").style.display = "block";

          document.getElementById("downloadLink").href = imageUrl;
          document.getElementById("downloadLink").style.display = "block";

          document.getElementById("sendWebhookBtn").style.display = "block";

          // Event listener para el botón "Publicar en Facebook e Instagram"
          document
            .getElementById("sendWebhookBtn")
            .addEventListener("click", function () {
              const webhookData = {
                title: titleInput.value,
                description: descriptionInput.value,
                imageUrl: imageUrl, // Usar la URL original
                image: imageBase64, // Enviar la imagen en base64
              };

              // Enviar los datos al webhook
              fetch("/.netlify/functions/send_webhook", {
                // Apunta a la nueva función
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
                    // Muestra el mensaje de error al usuario
                    document.getElementById("errorMessage").textContent =
                      "Error al enviar el webhook: " + data.error;
                    document.getElementById("errorMessage").style.display =
                      "block";
                  } else {
                    console.log("Webhook enviado con éxito", data);
                    // Muestra el mensaje de éxito al usuario
                    document.getElementById("successMessage").textContent =
                      "Webhook enviado con éxito";
                    document.getElementById("successMessage").style.display =
                      "block";
                  }
                })
                .catch((error) => {
                  console.error("Error al enviar el webhook:", error);
                  // Muestra el mensaje de error al usuario
                  document.getElementById("errorMessage").textContent =
                    "Error al enviar el webhook: " + error.message;
                  document.getElementById("errorMessage").style.display =
                    "block";
                });
            });
        }
      })
      .catch((error) => {
        console.error("Error al procesar la imagen:", error);
        document.getElementById("errorMessage").textContent =
          "Error al procesar la imagen: " + error.message;
        document.getElementById("errorMessage").style.display = "block";
      });
  });
