import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface TestDataOptions {
  includeTestData: boolean;
  setIncludeTestData: (include: boolean) => void;
  canToggleTestData: boolean;
  getSurveyTable: () => string;
  getResponseTable: () => string;
  getAnswerTable: () => string;
}

export function useTestDataToggle(): TestDataOptions {
  const [includeTestData, setIncludeTestData] = useState(false);
  const { userRoles, user } = useAuth();
  
  // Only the specific developer can toggle test data
  const canToggleTestData = user?.email === 'sethetrend87@osstem.com';

  const getSurveyTable = () => 'surveys'; // Always use surveys table
  const getResponseTable = () => 'survey_responses'; // Always use survey_responses table
  const getAnswerTable = () => 'question_answers'; // Always use question_answers table

  return {
    includeTestData,
    setIncludeTestData,
    canToggleTestData,
    getSurveyTable,
    getResponseTable,
    getAnswerTable,
  };
}