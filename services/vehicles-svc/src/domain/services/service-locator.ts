export interface ServiceLocator {
    /** devuelve una URL usable, p.ej. http://users-svc.fuelhub.svc.cluster.local:8080 */
    pick(service: string): Promise<string>;
}
