const hintField = document.querySelector('.hint-field');
const hintText = document.querySelector('.hint-field .hint');
const VISIBLE_PERIOD = 1.5e3;

function notify({ type = '', message = '', period = VISIBLE_PERIOD }) {
  if (hintField.classList.length === 1) {
    hintText.textContent = message;
    if (type === 'success') {
      hintText.classList.add('hint_success');
      hintField.classList.add('hint-field_visible');
      setTimeout(function () {
        hintField.classList.remove('hint-field_visible');
        hintText.classList.remove('hint_success');
      }, period);
    } else {
      hintText.classList.add('hint_error');
      hintField.classList.add('hint-field_visible');
      setTimeout(function () {
        hintField.classList.remove('hint-field_visible');
        hintText.classList.remove('hint_error');
      }, period);
    }
  }
}

function getStorage() {
  chrome.storage.local.get(null, function (res) {
    console.log(res);
  });
}

function setStorage(data) {
  if (data) {
    chrome.storage.local.set(data);
  }
}
