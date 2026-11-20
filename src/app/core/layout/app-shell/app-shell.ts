import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-app-shell',
  imports: [Header, Sidebar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {

}
