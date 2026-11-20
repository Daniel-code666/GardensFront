import { Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-dialog',
  imports: [DialogModule],
  templateUrl: './app-dialog.html',
  styleUrl: './app-dialog.css',
})
export class AppDialog {
  readonly visible = input(false);
  readonly title = input('');
  readonly width = input('32rem');

  readonly visibleChange = output<boolean>();
}
