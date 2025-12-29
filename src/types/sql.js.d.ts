declare module 'sql.js' {
    export interface Database {
        run(sql: string, params?: any[]): void;
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    export interface Statement {
        bind(params: any[]): void;
        step(): boolean;
        getAsObject(): any;
        free(): void;
    }

    export interface SqlJsStatic {
        Database: new (data?: Uint8Array | Buffer | undefined) => Database;
    }

    const initSqlJs: (config?: any) => Promise<SqlJsStatic>;
    export default initSqlJs;
}
