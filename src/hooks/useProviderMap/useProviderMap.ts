import { createSingletonHook } from 'hooks/common/factories/SingletonFactory';

const createProviderMap = () => {
  return {};
};

const useProviderMapInstance = createSingletonHook(createProviderMap);

export const useProviderMap = () => {
  return useProviderMapInstance();
};

export const getProviderMap = () => {
  return useProviderMapInstance();
};
