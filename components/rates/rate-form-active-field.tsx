"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RateFormActiveFieldProps = {
  id: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function RateFormActiveField({
  id,
  value,
  onChange,
}: RateFormActiveFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Status</Label>
      <Select
        value={value ? "active" : "inactive"}
        onValueChange={(next) => onChange(next === "active")}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
