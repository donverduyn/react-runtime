// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-deprecated */

// primary API
export { WithRuntime as withRuntime } from '@/components/withRuntime/withRuntime';
export { WithUpstream as withUpstream } from '@/components/withUpstream/withUpstream';
export { WithProps as withProps } from '@/components/withProps/withProps';

// testing utilties
export { WithMock as withMock } from '@/components/withMock/withMock';
export { WithProviderScope as withProviderScope } from '@/components/withProviderScope/withProviderScope';

// we don't paternalize our users, full access to system primtives
export * from '@/components/common/System/System';
export * from '@/types';

export * from '@/utils/effect';
export * from '@/utils/react';
