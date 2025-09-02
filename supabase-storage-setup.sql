-- Supabase Storage Setup for Profile Pictures
-- Run this in your Supabase SQL Editor

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy to allow users to view all profile pictures (since bucket is public)
CREATE POLICY "Anyone can view profile pictures" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-pictures');

-- Create policy to allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create policy to allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-pictures' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify the setup
SELECT 'Storage bucket setup complete! Profile pictures can now be uploaded.' as status;
