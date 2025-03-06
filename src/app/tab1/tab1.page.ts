import { Component } from '@angular/core';
import { FirebaseX } from '@awesome-cordova-plugins/firebase-x/ngx';
import { Platform } from '@ionic/angular';


@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  constructor(private platform: Platform, private firebase: FirebaseX) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.setupFirebase();
    });
  }

  setupFirebase() {
    // Get the FCM token
    this.firebase.getToken().then(token => {
      console.log('FCM Token:', token);
    }).catch(error => {
      console.error('Error getting token:', error);
    });

    // Listen for incoming notifications
    this.firebase.onMessageReceived().subscribe(data => {
      console.log('Message received:', data);
      alert(JSON.stringify(data)); // Handle the notification
    });

    // Listen for token refresh
    this.firebase.onTokenRefresh().subscribe(token => {
      console.log('New FCM Token:', token);
    });
  }
}
