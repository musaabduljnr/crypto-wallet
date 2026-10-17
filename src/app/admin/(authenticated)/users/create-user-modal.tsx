"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { createAdminUserAction } from "@/actions/admin.actions";
import { UserPlus, X, Check } from "lucide-react";

export function CreateUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [kycTier, setKycTier] = useState("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !phoneNumber) {
      setErrorMsg("Please fill in all required user profile fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createAdminUserAction({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      password: tempPassword ? tempPassword.trim() : undefined,
      kycTier: parseInt(kycTier, 10),
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessMsg(`User ${email} created successfully. An invitation has been dispatched.`);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
        setEmail("");
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setTempPassword("");
      }, 1500);
    } else {
      setErrorMsg(res.error || "Failed to create user");
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)} className="text-xs">
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        Create User
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span>Create Customer Account</span>
              </CardTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                {errorMsg && (
                  <InlineNotice variant="destructive" title="Creation Failed">
                    {errorMsg}
                  </InlineNotice>
                )}
                {successMsg && (
                  <InlineNotice variant="success" title="Success">
                    {successMsg}
                  </InlineNotice>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                  />
                  <Input
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  required
                />

                <Input
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+12025550199"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      KYC Tier
                    </label>
                    <select
                      value={kycTier}
                      onChange={(e) => setKycTier(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="1">Tier 1 (Basic)</option>
                      <option value="2">Tier 2 (Standard)</option>
                      <option value="3">Tier 3 (Institutional)</option>
                    </select>
                  </div>

                  <Input
                    label="Initial Password"
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Optional (auto-gen)"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Provision Account
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
