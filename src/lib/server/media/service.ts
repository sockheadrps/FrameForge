import { readConfig } from '../config';
import { LinkedMediaService } from './linked-media';
import { ManagedMediaStorage } from './managed-media';

let service: LinkedMediaService | undefined;
let managedStorage: ManagedMediaStorage | undefined;

export function getLinkedMediaService() {
	service ??= new LinkedMediaService(readConfig(process.env).linkedMediaRoots);
	return service;
}

export function getManagedMediaStorage() {
	const config = readConfig(process.env);
	managedStorage ??= new ManagedMediaStorage(config.mediaRoot, config.uploadLimitMb * 1024 * 1024);
	return managedStorage;
}
