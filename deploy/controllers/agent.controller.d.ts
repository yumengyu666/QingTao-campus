import { Request, Response } from 'express';
export declare function agentChat(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function agentChatStream(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function clearConversation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function submitFeedback(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listSessions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=agent.controller.d.ts.map