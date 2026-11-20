export interface OperationResult<T> {
    operationName: string;
    successful: boolean;
    errorCode: number | null;
    errorMessage: string | null;
    result: T | null;
}