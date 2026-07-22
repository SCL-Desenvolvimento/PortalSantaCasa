import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FeedbackModalComponent } from './components/feedback-modal/feedback-modal.component';
import { PublicAccessLogModalComponent } from './components/public-access-log-modal/public-access-log-modal.component';

@NgModule({
  declarations: [
    FeedbackModalComponent,
    PublicAccessLogModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    FeedbackModalComponent,
    PublicAccessLogModalComponent,
    FormsModule
  ]
})
export class SharedModule { }
