'use strict';
const privacyEmail=window.MASKI_CONFIG?.privacyContact;
if(privacyEmail)document.getElementById('privacy-contact').textContent=privacyEmail;
