//Onclick spinner for all submit type buttons
let submitButtons = document.querySelectorAll('button[type=submit]');
for (let i = 0; i < submitButtons.length; i++) {
    submitButtons[i].addEventListener("click", function(event) {
        event.target.classList.add('spinner');
    });
}