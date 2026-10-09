'use client';
import { useSyncExternalStore, type ReactNode } from 'react';
import { attributionHref } from '@/lib/attribution';
const subscribe = () => () => {};
export function AttributedLink({children, path='/isolation/estimation', className}: {children:ReactNode;path?:string;className?:string}) {
  const query = useSyncExternalStore(subscribe, () => window.location.search, () => '');
  return <a className={className} href={attributionHref(path, query)} onClick={event => { event.currentTarget.href = attributionHref(path, window.location.search); }}>{children}</a>;
}
