//export interface Post{
//  title: string;
//  message: string;
//  image?: string; // Opcional, URL ou base64
//  providers: string[]; // Ex: ["facebook", "instagram", "linkedin"]
//  scheduledAtUtc?: Date;
//}

export interface Post {
  id: number;
  title: string;
  message: string;
  imageUrl?: string;
  imageFileName?: string;
  providers: string[];
  status: PostStatus;
  scheduledAt?: string;
  createdAt: string;
  publishedAt?: string;
  errorMessage?: string;
  createdByUserId?: string;
  facebookPostId?: string;
  instagramPostId?: string;
  linkedInPostId?: string;
  metadata?: any;
  isActive: boolean;
  retryCount: number;
  lastRetryAtUtc?: string;
  engagement: {
    likes: 0,
    shares: 0,
    comments: 0,
    views: 0
  }

}

export enum PostStatus {
  Draft = 0,
  Scheduled = 1,
  Published = 2,
  Failed = 3,
  Cancelled = 4
}
