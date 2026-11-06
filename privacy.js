'use strict';
const privacyEmail=window.MASKIT_CONFIG?.privacyContact;
if(privacyEmail)document.getElementById('privacy-contact').textContent=privacyEmail;
