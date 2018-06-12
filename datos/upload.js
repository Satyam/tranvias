const admin = require('firebase-admin');

const serviceAccount = require('./tranvias-ebff1-firebase-adminsdk-fh8ll-b7d7e06738.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tranvias-ebff1.firebaseio.com',
});

const data = require('./fStore.json');

data &&
  Object.keys(data).forEach(key => {
    const nestedContent = data[key];

    if (typeof nestedContent === 'object') {
      Object.keys(nestedContent).forEach(docTitle => {
        admin
          .firestore()
          .collection(key)
          .doc(docTitle)
          .set(nestedContent[docTitle])
          .then(res => {
            console.log('Document successfully written!');
          })
          .catch(error => {
            console.error('Error writing document: ', error);
          });
      });
    }
  });
