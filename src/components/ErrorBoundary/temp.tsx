const loadNotes = async () => {
  try {
    console.log('Fetching notes from storage...');
    const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      console.log('Loaded notes from storage:', parsedNotes);
      setNotes(parsedNotes);
    } else {
      console.log('No notes found in storage');
    }
  } catch (error) {
    console.error('Error loading notes:', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  if (!isLoading) {
    saveNotes();
  }
}, [notes, isLoading]);

const saveNotes = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    console.log('Notes saved to storage successfully');
  } catch (error) {
    console.error('Error saving notes:', error);
  }
};