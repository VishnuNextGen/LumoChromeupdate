import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

export const logout = async () => {
    return signOut(auth);
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Do not throw so we don't crash the app on offline/disconnects
}

// User Profile
export const saveUserProfile = async (user: any) => {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                email: user.email,
                name: user.displayName || 'Anonymous User',
                createdAt: serverTimestamp()
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
};

// Projects
export const getUserProjects = async (userId: string) => {
    try {
        const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'projects');
        return [];
    }
};

export const createProjectDoc = async (project: any) => {
    try {
        const pRef = doc(db, 'projects', project.id);
        const toSave = {
            name: project.name,
            description: project.description || '',
            ownerId: project.ownerId,
            fileName: project.fileName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            data: JSON.stringify(project.data)
        };
        await setDoc(pRef, toSave);
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `projects/${project.id}`);
    }
};

export const updateProjectDoc = async (project: any) => {
    try {
        const pRef = doc(db, 'projects', project.id);
        const toSave = {
            name: project.name,
            description: project.description || '',
            updatedAt: serverTimestamp(),
            data: JSON.stringify(project.data)
        };
        await updateDoc(pRef, toSave);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
};

export const deleteProjectDoc = async (projectId: string) => {
    try {
        await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
};

export const testConnection = async () => {
    // Check connection
    try {
        await getDoc(doc(db, 'test', 'connection'));
    } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};
