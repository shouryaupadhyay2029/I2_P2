import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase/storage";
import { logFirebaseError } from "../firebase/errorLogging";

/**
 * Uploads a file to Firebase Storage under events/{eventId}/cover-image.
 * Supports progress tracking.
 */
export const uploadEventImage = async (file, eventId, onProgress) => {
  const id = eventId || Math.random().toString(36).substring(2, 11);
  const storageRef = ref(storage, `events/${id}/cover-image`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = snapshot.totalBytes > 0
          ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          : 0;

        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        logFirebaseError("[uploadEventImage] Storage upload failed.", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          logFirebaseError("[uploadEventImage] Failed to retrieve download URL.", error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Deletes an event image from Firebase Storage.
 */
export const deleteEventImage = async (path) => {
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    logFirebaseError("[deleteEventImage] Failed to delete event image.", error);
    throw error;
  }
};

/**
 * Resolves the download URL for a given storage path.
 */
export const getImageURL = async (path) => {
  const storageRef = ref(storage, path);
  try {
    return await getDownloadURL(storageRef);
  } catch (error) {
    logFirebaseError("[getImageURL] Failed to resolve image URL.", error);
    throw error;
  }
};
