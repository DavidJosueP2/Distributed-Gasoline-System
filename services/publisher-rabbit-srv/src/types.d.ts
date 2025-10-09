// Local module declarations to help the TypeScript server when types are not found.
declare module 'eureka-js-client' {
	interface EurekaDataCenterInfo {
		'@class': string;
		name: string;
	}

	interface EurekaInstanceConfig {
		app: string;
		instanceId: string;
		hostName: string;
		ipAddr: string;
		port: { $: number; '@enabled': boolean };
		vipAddress?: string;
		dataCenterInfo: EurekaDataCenterInfo;
	}

	interface EurekaClientConfig {
		host: string;
		port: number;
		servicePath: string;
	}

	export interface EurekaConfig {
		instance: EurekaInstanceConfig;
		eureka: EurekaClientConfig;
	}

	export class Eureka {
		constructor(config: EurekaConfig);
		start(callback?: (error?: Error) => void): void;
		stop(callback?: () => void): void;
	}
}

// You can expand these declarations with specific types if needed later.
