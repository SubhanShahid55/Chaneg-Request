-- Private profile pictures. The API uses the service role and issues short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS profile_pictures_select ON storage.objects;
DROP POLICY IF EXISTS profile_pictures_insert ON storage.objects;
DROP POLICY IF EXISTS profile_pictures_update ON storage.objects;
DROP POLICY IF EXISTS profile_pictures_delete ON storage.objects;

CREATE POLICY profile_pictures_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

CREATE POLICY profile_pictures_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

CREATE POLICY profile_pictures_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

CREATE POLICY profile_pictures_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);