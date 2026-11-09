//submit account forms without navigating to the backend response
const form = document.querySelector("form");
const submitButton = form.querySelector('button[type="submit"]');
const errorMessage = document.querySelector("#form-error");
const successDialog = document.querySelector("#success-dialog");
const successMessage = document.querySelector("#success-message");

//return home when the confirmation is closed with ok or escape
successDialog.querySelector("button").addEventListener("click", () => successDialog.close());
successDialog.addEventListener("close", () => window.location.assign("/"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  submitButton.disabled = true;
  errorMessage.textContent = "";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      body: new URLSearchParams(new FormData(form))
    });
    const data = await response.json();
    if (!response.ok) {
      errorMessage.textContent = data.error || "Please check your details and try again.";
      return;
    }

    //display the message as text inside the themed popup
    successMessage.textContent = data.message;
    successDialog.showModal();
  } catch {
    errorMessage.textContent = "We couldn't complete the request. Please try again.";
  } finally {
    submitButton.disabled = successDialog.open;
  }
});
