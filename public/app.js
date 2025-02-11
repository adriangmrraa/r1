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
    fetch("/generate", {
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
