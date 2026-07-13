type ReviewTargetType = 'goods' | 'posts' | 'lostfound' | 'profile' | 'goods_comment' | 'post_comment' | 'lostfound_comment';
interface ReviewResult {
    id: number;
    type: ReviewTargetType;
    status: string;
}
export declare function approveReview(type: ReviewTargetType, id: number, reviewerId: number): Promise<ReviewResult>;
export declare function rejectReview(type: ReviewTargetType, id: number, reviewerId: number, reason: string): Promise<ReviewResult>;
export {};
//# sourceMappingURL=review.service.d.ts.map