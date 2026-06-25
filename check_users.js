const admin = require("firebase-admin");

const serviceAccount = {
  "type": "service_account",
  "project_id": "prepassist-v2",
  "private_key_id": "dummy_key_id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7epo8NXXuNIQ1\ndr7iGf9LF6z3/kET6yzWqQ7YEj1DazPcola0L2L5UfIWehb7FcoUG80O1bZHic2i\nsVu6F6Qd1kCKb6J1be3z8li+jtPr2CnkoUIJarQZ9niYxQMl4dH2rq8gjvWmc9lT\nZ7ZUqoR/susn8Ox1AzF9630meXxISA/tZiVhVX52GZ20PyO60iESVVqBnsRbIiD/\nuxD6eH2Ubc8xUPfXcqOsp7GRrrz5uQrWwNQVGHqFuDL588rh64vMIBeY4OQL4UPB\nhcI/I3fXpL2K0hWexKaO6/03JXRJhSVmLfv4a2xy5nLq/RvKKizYm5VEtrf+5XBM\nIxGf84d5AgMBAAECggEAE8GNEoJvM5t+4ZvqbEzhR05exLDbNoBCNLoytWABqvK3\nb7z/LkRulXeWT1pNBOdESNdvpcwtRc9elzIBqKPwYFEJMtVl/SIpELuFcMpACIK6\nUmyQVwnyoehER9P9+45XB/vbOk76UbC0UnrTvssLxKGr8GTt4/xCyUJJKUZky4B3\nVqbAJHUx/GUCT5V0k/oAQKP7NezuSvFgwObdG57cF7NG23uAJ2V/P/lgS/EOCa23\nCh31/eXvzBDJzyojBOnvAZvm83bDbIU1UzXPu5/eEMnlIrbDf0juziehogfgrwuD\n7rv+Vrkej13bpwBcsuz0AatwnQb0TO/JJwaJtBwMEQKBgQDgctOgLap0gCtHgKZ6\nvqVlebSC5UzdqMHbmOo2COueMkPEtEhNd9D5QooxMAh3EmjQQTiIE/sW6pozXnIq\n3AK1IhPj60FaE2KHzWiA1MTlgelubJX2nqWop+BvSsTlVADtp7zPsa9ePflMU5GK\nW+b1ytdiKy/uTLXlbbV43nFhKQKBgQDV1Vvy/ItABZVYl/ozMWlYZBIBDVUAj7hM\nBspBtkiUbbrVTKHZ0groOQXFsBZg3L5+u0lllQ2qLzGOiBbM9lG+12xG1D7MgLnw\nOlXoWydYqhLGbH6ymKpUQUzUqHQMbM8//K7TEnSh6CkTc2cmRf7v86Yiw1I0CSxR\nnm1F67ct0QKBgEXdeGJz1ItPGim3shqjHXjo2XelSLf2v+FLSBxpym4D13Rzac4z\nbakpPTryaLAn2th4dNBm59HKVRWIYKFWusEHSom3wS/4uMLs/YqcsG2Actkck9Gg\nsJA/MW1zKLb53xAbFnrQJHaBdAh+Ot+Gm+4GpeS47MKQvk4cSFDHbSOBAoGAAUdt\nbV6lVpSx9/2wuW2qO6UdlnQF9iLl7057FzmH5ZtiarQyo6Ll/c2Zgz0yZRHs8cUd\nA0aI9mOh4EBgIom2o3WWaDYMyhxbAFzY9rLU4WrjAdzURS00l5xsYTlAuHJOKwvP\n3+NUX0OMO1mNXGU+ySCj9cFFVJpZcYOJE8n9JoECgYBV6jPfpiMLc6X5ON7cUmI9\nZp1VS2QkGntmA1o32sAXf9Vo7yD2x1A7DFQQj7Te0UYwgGNj+U172U+zuCXkJQn7\n4T0h4sA2jE73bX8TMERdNgBf57RD8+zT0PydwzT6hV/uZoIsKk489MySyjsGnQqs\nAUoS9YObHwU175E7CMI8SQ==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@prepassist-v2.iam.gserviceaccount.com",
  "client_id": "113825838030230553753",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40prepassist-v2.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function countUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`Successfully connected to Firebase!`);
    console.log(`Total users found: ${listUsersResult.users.length}`);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`- ${userRecord.email}`);
    });
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

countUsers();
