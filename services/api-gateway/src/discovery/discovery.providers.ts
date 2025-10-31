import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EurekaLocator } from './eureka-locator';
import { K8sDnsLocator } from './k8s-dns-locator';
import { EurekaService } from './eureka.service';
import { RoundRobin } from './lb.strategy';
import { ServiceLocator } from './service-locator';

export const SERVICE_LOCATOR_TOKEN = 'SERVICE_LOCATOR';

export const ServiceLocatorProvider: Provider<ServiceLocator> = {
    provide: SERVICE_LOCATOR_TOKEN,
    useFactory: (
        config: ConfigService,
        eureka: EurekaService,
        rr: RoundRobin,
    ) => {
        const mode =
            (config.get<string>('DISCOVERY_MODE') ?? process.env.DISCOVERY_MODE ?? 'eureka').toLocaleLowerCase();
        if (mode === 'dns') {
            return new K8sDnsLocator(config);
        }
        return new EurekaLocator(config, eureka, rr);
    },
    inject: [ConfigService, EurekaService, RoundRobin],
};
