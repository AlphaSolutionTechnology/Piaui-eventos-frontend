import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Users {}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css'],
})
export class LoginPage {
  constructor(private http: HttpClient) {}

  getUsers(username: string, password: string): void {
    if (!username || !password) {
      alert('Please enter both username and password.');
    }
    console.log('Fetching users...');
  }
}
