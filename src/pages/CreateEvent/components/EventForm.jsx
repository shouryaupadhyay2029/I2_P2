import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategorySelector } from './CategorySelector';
import { ImageUploader } from './ImageUploader';
import { DatePicker } from './DatePicker';
import { CapacityInput } from './CapacityInput';
import { Button } from '../../../components/ui/Button';
import { createEvent } from '../../../services/eventService';
import { logFirebaseError } from '../../../firebase/errorLogging';
import { validateClubHours } from '../../../utils/clubHours';

export const EventForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    image: '',
    venue: '',
    organizer: '',
    date: '',
    endDate: '',
    time: '',
    capacity: '',
    registrationDeadline: '',
    tags: '',
    visibility: 'public',
    status: 'published',
    clubHours: {
      enabled: false,
      participationHours: 0,
      organizerHours: 0
    }
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const validate = () => {
    const newErrors = {};
    const today = new Date().toISOString().split('T')[0];

    // Presence checks
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.image) newErrors.image = "Image is required";
    if (!formData.venue.trim()) newErrors.venue = "Venue is required";
    if (!formData.organizer.trim()) newErrors.organizer = "Organizer is required";
    if (!formData.date) newErrors.date = "Event date is required";
    if (!formData.time) newErrors.time = "Event time is required";
    if (!formData.capacity) newErrors.capacity = "Capacity is required";
    if (!formData.registrationDeadline) newErrors.registrationDeadline = "Registration deadline is required";

    // Numerical checks
    if (formData.capacity && Number(formData.capacity) <= 0) {
      newErrors.capacity = "Capacity must be greater than 0";
    }

    // Date logical checks
    if (formData.date && formData.date < today) {
      newErrors.date = "Event date must be in the future";
    }

    if (formData.date && formData.endDate) {
      if (formData.endDate < formData.date) {
        newErrors.endDate = "End date must be on or after start date";
      }
    }

    if (formData.date && formData.registrationDeadline) {
      if (formData.registrationDeadline > formData.date) {
        newErrors.registrationDeadline = "Deadline must be on or before the event date";
      }
    }

    if (formData.clubHours?.enabled) {
      const hoursValidation = validateClubHours(formData.clubHours);
      if (!hoursValidation.valid) {
        newErrors.clubHours = hoursValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, submitStatus) => {
    if (e) e.preventDefault();
    if (isImageUploading) {
      triggerToast('error', "Please wait until the image upload completes.");
      return;
    }
    if (!validate()) {
      triggerToast('error', "Please resolve form validation errors.");
      return;
    }

    setLoading(true);
    try {
      const finalStatus = submitStatus === 'open' ? 'published' : submitStatus;
      const normalizedClubHours = formData.clubHours?.enabled ? {
        enabled: true,
        participationHours: Number(formData.clubHours.participationHours) || 0,
        organizerHours: Number(formData.clubHours.organizerHours) || 0
      } : {
        enabled: false,
        participationHours: 0,
        organizerHours: 0
      };

      await createEvent({
        ...formData,
        clubHours: normalizedClubHours,
        status: finalStatus
      });
      triggerToast('success', finalStatus === 'draft' ? "Event saved as Draft successfully." : "Event published successfully.");
      setFormData({
        title: '',
        description: '',
        category: '',
        image: '',
        venue: '',
        organizer: '',
        date: '',
        endDate: '',
        time: '',
        capacity: '',
        registrationDeadline: '',
        tags: '',
        visibility: 'public',
        status: 'draft',
        clubHours: {
          enabled: false,
          participationHours: 0,
          organizerHours: 0
        }
      });
      setErrors({});
    } catch (error) {
      logFirebaseError("[EventForm] Failed to publish event to database.", error);
      triggerToast('error', `Failed to save event: ${error.message || 'Database connection refused.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-10 text-left max-w-2xl relative font-ui">
      
      {/* Editorial Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 border backdrop-blur-md flex items-center gap-4 shadow-lg min-w-[300px] rounded-full ${
              toast.type === 'success' 
                ? 'border-green-500/20 bg-white text-green-700 shadow-sm' 
                : 'border-red-500/20 bg-white text-red-700 shadow-sm'
            }`}
          >
            <span className="text-[0.6rem] font-technical uppercase border border-current px-1.5 py-0.5 rounded-full">
              {toast.type}
            </span>
            <span className="text-xs font-ui tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row: Title */}
      <div className="flex flex-col gap-3">
        <label className="text-micro text-black/50">Event Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Symphony Night"
          className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
        />
        {errors.title && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{errors.title}</span>}
      </div>

      {/* Row: Description */}
      <div className="flex flex-col gap-3">
        <label className="text-micro text-black/50">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the nature of this experience..."
          rows={5}
          className="w-full bg-white border border-black/10 px-5 py-4 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-[20px] transition-colors resize-none"
        />
        {errors.description && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{errors.description}</span>}
      </div>

      {/* Row: Category */}
      <CategorySelector
        value={formData.category}
        onChange={(cat) => setFormData({ ...formData, category: cat })}
        error={errors.category}
      />

      {/* Row: Image Uploader */}
      <ImageUploader
        value={formData.image}
        onChange={(img) => setFormData({ ...formData, image: img })}
        error={errors.image}
        onUploadStateChange={setIsImageUploading}
      />

      {/* Grid: Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          <label className="text-micro text-black/50">Venue</label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            placeholder="e.g. Auditorium / Block A"
            className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
          />
          {errors.venue && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{errors.venue}</span>}
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-micro text-black/50">Organizer</label>
          <input
            type="text"
            value={formData.organizer}
            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            placeholder="e.g. Computer Science Dept"
            className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
          />
          {errors.organizer && <span className="text-[0.7rem] text-red-600 font-technical uppercase tracking-wide">{errors.organizer}</span>}
        </div>
      </div>

      {/* Grid: Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <DatePicker
          label="Start Date"
          value={formData.date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(date) => setFormData({ ...formData, date })}
          error={errors.date}
        />

        <DatePicker
          label="End Date"
          value={formData.endDate}
          min={formData.date || new Date().toISOString().split('T')[0]}
          onChange={(endDate) => setFormData({ ...formData, endDate })}
          error={errors.endDate}
        />

        <DatePicker
          label="Event Time"
          type="time"
          value={formData.time}
          onChange={(time) => setFormData({ ...formData, time })}
          error={errors.time}
        />
      </div>

      {/* Grid: Limits & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CapacityInput
          value={formData.capacity}
          onChange={(capacity) => setFormData({ ...formData, capacity })}
          error={errors.capacity}
        />

        <DatePicker
          label="Registration Deadline"
          value={formData.registrationDeadline}
          onChange={(deadline) => setFormData({ ...formData, registrationDeadline: deadline })}
          error={errors.registrationDeadline}
        />
      </div>

      {/* Grid: Tags & Visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3 text-left">
          <label className="text-micro text-black/50">Tags (Comma-separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g. hackathon, coding, artificial intelligence"
            className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 placeholder-black/30 focus:outline-none focus:border-black font-ui rounded-full transition-colors"
          />
        </div>

        <div className="flex flex-col gap-3 text-left">
          <label className="text-micro text-black/50">Visibility</label>
          <select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            className="w-full bg-white border border-black/10 px-5 py-3.5 text-sm text-black/80 focus:outline-none focus:border-black font-ui rounded-full transition-colors cursor-pointer"
          >
            <option value="public">Public (Visible on Discovery)</option>
            <option value="private">Private (Hidden from Discovery)</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-6 border-t border-black/5 flex justify-end gap-4 mt-6">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || isImageUploading}
          onClick={(e) => handleSubmit(e, 'draft')}
          size="lg"
          className="min-w-[140px] rounded-full"
        >
          Save Draft
        </Button>
        <Button
          type="button"
          disabled={loading || isImageUploading}
          onClick={(e) => handleSubmit(e, 'open')}
          size="lg"
          className="min-w-[140px] rounded-full"
        >
          {loading ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </form>
  );
};
