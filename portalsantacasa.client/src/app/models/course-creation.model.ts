export interface CourseCreation {
  title: string;
  description: string;
  videoUrl: string;
  creatorId: number; // ID do usuário que está cadastrando (admin)
  assignedUserIds: number[]; // IDs dos usuários que receberão o curso
}
