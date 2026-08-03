import { SafetyQuestGame } from '@/features/safety-quest/SafetyQuestGame';
import { useAuth } from '@/contexts/AuthContext';

const SafetyQuest = () => {
  const { user } = useAuth();
  return <SafetyQuestGame userId={user?.id} />;
};

export default SafetyQuest;