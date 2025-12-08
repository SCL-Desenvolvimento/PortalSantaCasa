import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FeedbackModalComponent } from './components/feedback-modal/feedback-modal.component';

@NgModule({
  declarations: [
    FeedbackModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    FeedbackModalComponent,
    FormsModule
  ]
})
export class SharedModule { }
