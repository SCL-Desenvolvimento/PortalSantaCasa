export interface FormsResponseDto {
  id: number;
  title: string;
  description?: string;
  formsLink?: string;
}

export interface FormsCreateDto {
  title: string;
  description?: string;
  formsLink?: string;
}

export interface FormsUpdateDto {
  title: string;
  description?: string;
  formsLink?: string;
}
