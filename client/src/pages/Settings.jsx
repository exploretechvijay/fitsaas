import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Settings2,
  Building2,
  Clock,
  Palette,
  Bell,
  Key,
  Lock,
  Save,
  Upload,
  AlertCircle,
  Tag,
  Plus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { gymApi, authApi } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SECTIONS = [
  { key: 'profile', label: 'Gym Profile', icon: Building2 },
  { key: 'hours', label: 'Business Hours', icon: Clock },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'features', label: 'Gym Features', icon: Tag },
  { key: 'api', label: 'API Keys', icon: Key },
  { key: 'password', label: 'Change Password', icon: Lock },
];

export default function Settings() {
  const { user, fetchUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState(null);
  const [error, setError] = useState(null);

  // Gym profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm();
  const [savingProfile, setSavingProfile] = useState(false);

  // Business hours
  const [hours, setHours] = useState(
    DAYS_OF_WEEK.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { open: '06:00', close: '22:00', closed: false },
      }),
      {}
    )
  );
  const [savingHours, setSavingHours] = useState(false);

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#22c55e');
  const [savingBranding, setSavingBranding] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    emailNewMember: true,
    emailExpiring: true,
    emailPayment: true,
    smsNewMember: false,
    smsExpiring: true,
    smsPayment: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Gym Features
  const [gymFeatures, setGymFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [savingFeatures, setSavingFeatures] = useState(false);

  // API Keys
  const [geminiKey, setGeminiKey] = useState('');
  const [savingApi, setSavingApi] = useState(false);

  // Change Password
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors },
  } = useForm();
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchGymProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gymApi.getProfile();
      const data = res.data.data;
      setGym(data);
      resetProfile({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
      });
      const businessHrs = data.business_hours || data.businessHours;
      if (businessHrs) {
        setHours(businessHrs);
      }
      const brandingData = data.branding;
      if (brandingData) {
        setPrimaryColor(brandingData.primary_color || brandingData.primaryColor || '#6366f1');
        setSecondaryColor(brandingData.secondary_color || brandingData.secondaryColor || '#22c55e');
      }
      const notifData = data.notifications;
      if (notifData) {
        setNotifications(notifData);
      }
      if (data.gemini_api_key) {
        setGeminiKey(data.gemini_api_key);
      }
      // Load gym features from branding
      const feats = brandingData?.gym_features;
      if (feats) {
        setGymFeatures(Array.isArray(feats) ? feats : []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [resetProfile]);

  useEffect(() => {
    fetchGymProfile();
  }, [fetchGymProfile]);

  // Save handlers
  const onSaveProfile = async (values) => {
    setSavingProfile(true);
    try {
      await gymApi.updateProfile(values);
      toast.success('Gym profile updated');
      fetchGymProfile();
    } catch {
      // handled
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveHours = async () => {
    setSavingHours(true);
    try {
      await gymApi.updateProfile({ business_hours: hours });
      toast.success('Business hours saved');
    } catch {
      // handled
    } finally {
      setSavingHours(false);
    }
  };

  const onSaveBranding = async () => {
    setSavingBranding(true);
    try {
      await gymApi.updateProfile({
        branding: { primary_color: primaryColor, secondary_color: secondaryColor },
      });
      toast.success('Branding saved');
    } catch {
      // handled
    } finally {
      setSavingBranding(false);
    }
  };

  const onSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await gymApi.updateProfile({ notifications });
      toast.success('Notification preferences saved');
    } catch {
      // handled
    } finally {
      setSavingNotifications(false);
    }
  };

  const addGymFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !gymFeatures.includes(trimmed)) {
      setGymFeatures([...gymFeatures, trimmed]);
      setNewFeature('');
    }
  };

  const removeGymFeature = (f) => setGymFeatures(gymFeatures.filter(x => x !== f));

  const onSaveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await gymApi.updateProfile({ branding: { primary_color: primaryColor, secondary_color: secondaryColor, gym_features: gymFeatures } });
      toast.success('Features saved');
    } catch {
      toast.error('Failed to save features');
    } finally {
      setSavingFeatures(false);
    }
  };

  const onSaveApiKeys = async () => {
    setSavingApi(true);
    try {
      await gymApi.updateProfile({ gemini_api_key: geminiKey });
      toast.success('API key saved');
    } catch {
      // handled
    } finally {
      setSavingApi(false);
    }
  };

  const onChangePassword = async (values) => {
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      toast.success('Password changed successfully');
      resetPassword();
    } catch {
      // handled
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading settings..." className="min-h-[60vh]" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load settings</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchGymProfile}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your gym configuration and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === section.key
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Gym Profile */}
          {activeSection === 'profile' && (
            <Card>
              <Card.Header>
                <Card.Title>Gym Profile</Card.Title>
                <Card.Description>Update your gym's public information</Card.Description>
              </Card.Header>
              <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gym Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerProfile('name', { required: 'Name is required' })}
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                  <div className="flex items-center gap-4">
                    {gym?.logo ? (
                      <img
                        src={gym.logo}
                        alt="Gym logo"
                        className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <Button type="button" variant="secondary" size="sm" icon={Upload}>
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
                    {...registerProfile('address')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                      {...registerProfile('phone')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                      {...registerProfile('email')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerProfile('website')}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" icon={Save} loading={savingProfile}>
                    Save Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Business Hours */}
          {activeSection === 'hours' && (
            <Card>
              <Card.Header>
                <Card.Title>Business Hours</Card.Title>
                <Card.Description>Set your gym's operating hours</Card.Description>
              </Card.Header>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 py-2"
                  >
                    <div className="w-28 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-700">{day}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hours[day]?.closed}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], closed: !e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">Open</span>
                    </label>
                    {!hours[day]?.closed ? (
                      <>
                        <input
                          type="time"
                          value={hours[day]?.open || '06:00'}
                          onChange={(e) =>
                            setHours((prev) => ({
                              ...prev,
                              [day]: { ...prev[day], open: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-400">to</span>
                        <input
                          type="time"
                          value={hours[day]?.close || '22:00'}
                          onChange={(e) =>
                            setHours((prev) => ({
                              ...prev,
                              [day]: { ...prev[day], close: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none cursor-pointer"
                        />
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <Button icon={Save} onClick={onSaveHours} loading={savingHours}>
                  Save Hours
                </Button>
              </div>
            </Card>
          )}

          {/* Branding */}
          {activeSection === 'branding' && (
            <Card>
              <Card.Header>
                <Card.Title>Branding</Card.Title>
                <Card.Description>Customize your gym's brand colors</Card.Description>
              </Card.Header>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <div
                      className="h-10 w-24 rounded-lg"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <div
                      className="h-10 w-24 rounded-lg"
                      style={{ backgroundColor: secondaryColor }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button icon={Save} onClick={onSaveBranding} loading={savingBranding}>
                    Save Branding
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <Card>
              <Card.Header>
                <Card.Title>Notification Preferences</Card.Title>
                <Card.Description>Choose what notifications to receive</Card.Description>
              </Card.Header>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Email Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'emailNewMember', label: 'New member registration' },
                      { key: 'emailExpiring', label: 'Subscription expiring' },
                      { key: 'emailPayment', label: 'Payment received' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setNotifications((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            notifications[item.key] ? 'bg-primary-500' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">SMS Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'smsNewMember', label: 'New member registration' },
                      { key: 'smsExpiring', label: 'Subscription expiring' },
                      { key: 'smsPayment', label: 'Payment received' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setNotifications((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            notifications[item.key] ? 'bg-primary-500' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button icon={Save} onClick={onSaveNotifications} loading={savingNotifications}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Gym Features */}
          {activeSection === 'features' && (
            <Card>
              <Card.Header>
                <Card.Title>Gym Features</Card.Title>
                <Card.Description>Manage features that can be included in subscription plans</Card.Description>
              </Card.Header>
              <div className="space-y-4">
                {/* Add new feature */}
                <div className="flex gap-2">
                  <input type="text" value={newFeature} onChange={e => setNewFeature(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGymFeature(); } }}
                    placeholder="Type a feature name and press Enter"
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
                  <Button type="button" icon={Plus} onClick={addGymFeature}>Add</Button>
                </div>

                {/* Feature list */}
                {gymFeatures.length > 0 ? (
                  <div className="space-y-2">
                    {gymFeatures.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg group">
                        <div className="flex items-center gap-3">
                          <Tag className="h-4 w-4 text-primary-500" />
                          <span className="text-sm font-medium text-gray-700">{f}</span>
                        </div>
                        <button onClick={() => removeGymFeature(f)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Remove">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No features added yet. Add features that your gym offers.</p>
                )}

                <Button icon={Save} onClick={onSaveFeatures} loading={savingFeatures}>Save Features</Button>
              </div>
            </Card>
          )}

          {/* API Keys */}
          {activeSection === 'api' && (
            <Card>
              <Card.Header>
                <Card.Title>API Keys</Card.Title>
                <Card.Description>Manage external service integrations</Card.Description>
              </Card.Header>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gemini API Key
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Required for AI-powered diet plan generation
                  </p>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
                <Button icon={Save} onClick={onSaveApiKeys} loading={savingApi}>
                  Save API Key
                </Button>
              </div>
            </Card>
          )}

          {/* Change Password */}
          {activeSection === 'password' && (
            <Card>
              <Card.Header>
                <Card.Title>Change Password</Card.Title>
                <Card.Description>Update your account password</Card.Description>
              </Card.Header>
              <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerPassword('currentPassword', {
                      required: 'Current password is required',
                    })}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerPassword('newPassword', {
                      required: 'New password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                    {...registerPassword('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (val) =>
                        val === watchPassword('newPassword') || 'Passwords do not match',
                    })}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button type="submit" icon={Lock} loading={savingPassword}>
                    Change Password
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
