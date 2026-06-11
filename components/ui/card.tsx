import * as React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  highlighted?: boolean;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function Card(props: CardProps) {
  const { className, highlighted, ...rest } = props;
  return (
    <div
      className={cn(
        'rounded-lg border border-border-default bg-surface-page p-6 shadow-sm',
        highlighted && 'border-primary-active',
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn('space-y-1', className)} {...rest} />;
}

export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props;
  return (
    <h2
      className={cn('font-heading text-xl text-text-primary', className)}
      {...rest}
    />
  );
}

export function CardDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  const { className, ...rest } = props;
  return <p className={cn('text-sm text-text-secondary', className)} {...rest} />;
}

export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn('mt-6 flex gap-3', className)} {...rest} />;
}
