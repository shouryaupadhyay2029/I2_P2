import React from "react";
import { cn } from "../../utils/cn";

export const Table = ({ className, children, ...props }) => (
  <div className="w-full overflow-auto">
    <table
      className={cn("w-full caption-bottom text-sm border-collapse", className)}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, children, ...props }) => (
  <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ className, children, ...props }) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ className, children, ...props }) => (
  <tr
    className={cn(
      "border-b border-border transition-colors hover:bg-surface/50 data-[state=selected]:bg-surface",
      className
    )}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead = ({ className, children, ...props }) => (
  <th
    className={cn(
      "h-12 px-4 text-left align-middle font-technical text-metadata text-secondary uppercase tracking-widest",
      className
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({ className, children, ...props }) => (
  <td className={cn("p-4 align-middle font-ui text-body", className)} {...props}>
    {children}
  </td>
);
