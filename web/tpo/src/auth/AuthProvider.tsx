import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ensureInstituteConfiguredForTpo, upsertInstituteAndMakeTpo } from "@/lib/firestore";
import type { UserDoc, UserRole } from "@/lib/types";

export type AppRole = UserRole;

export type UserProfile = {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  role: AppRole;
  instituteId?: string | null;
};

type RegisterCollegeInput = {
  instituteName: string;
  instituteCode?: string;
  domainsAllowed: string[]; // ["mitsgwalior.in"]
};

type RegisterAccountInput = {
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;

  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (input: RegisterAccountInput) => Promise<void>;
  logout: () => Promise<void>;

  registerCollege: (input: RegisterCollegeInput) => Promise<string>; // returns instituteId
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserDoc(u: User): Promise<UserProfile> {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile: UserDoc = {
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      photoUrl: u.photoURL,
      role: "tpo",
      instituteId: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    await setDoc(ref, profile as any, { merge: true });
    return {
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      photoUrl: u.photoURL,
      role: "tpo",
      instituteId: null,
    };
  }

  const data = snap.data() as UserDoc;
  return {
    uid: u.uid,
    email: u.email ?? data.email,
    name: u.displayName ?? (data.name ?? null),
    photoUrl: u.photoURL ?? (data.photoUrl ?? null),
    role: (data.role ?? "tpo") as AppRole,
    instituteId: data.instituteId ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const p = await ensureUserDoc(u);
      setProfile(p);

       // ✅ Backfill institute flags so Candidate picker can list this institute
       if (p.role === "tpo" && p.instituteId) {
         try {
           await ensureInstituteConfiguredForTpo(p.instituteId);
         } catch {
           // ignore
         }
       }

      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmailPassword = async (input: RegisterAccountInput) => {
    const email = input.email.trim();
    const password = input.password;
    const name = input.name.trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }

    const p = await ensureUserDoc(cred.user);
    setProfile(p);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerCollege = async (input: RegisterCollegeInput) => {
    if (!user) throw new Error("Not logged in");

    const instituteId = await upsertInstituteAndMakeTpo({
      uid: user.uid,
      instituteName: input.instituteName,
      instituteCode: input.instituteCode,
      domainsAllowed: input.domainsAllowed,
    });

    // Keep /users doc synced with current auth profile details
    await updateDoc(doc(db, "users", user.uid), {
      role: "tpo",
      instituteId,
      updatedAt: serverTimestamp(),
      email: user.email ?? null,
      name: user.displayName ?? null,
      photoUrl: user.photoURL ?? null,
    } as any);

    setProfile((prev) =>
      prev ? { ...prev, role: "tpo", instituteId } : { uid: user.uid, role: "tpo", instituteId },
    );

    return instituteId;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      loginWithEmailPassword,
      registerWithEmailPassword,
      logout,
      registerCollege,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
