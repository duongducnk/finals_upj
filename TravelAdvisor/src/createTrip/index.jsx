import React, { useState, useEffect } from 'react'
import GooglePlacesAutocomplete from 'react-google-places-autocomplete'
import Input_ from 'postcss/lib/input';
import { AI_PROMPT, SelectBudgetOptions, SelectTravelList } from '@/constants/options';
import { chatSession } from '@/service/AIModel';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { doc, setDoc } from "firebase/firestore"; 
import { db } from '@/service/firebaseConfig';
import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FcGoogle } from "react-icons/fc";


function CreateTrip() {
    const [query, setQuery] = useState(''); 
    const [place, setPlace] = useState(''); 
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]); 
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [formData, setFormData] = useState({ location: '', travelDays: 0, budget: '', people: '' });
    
    const navigate = useNavigate();

    const handleInputChange = (e) => { 
      const { name, value } = e.target;
      console.log(`${name}: ${value}`);
      if (name === 'query') {
        setQuery(value); 
      
      const apiKey = import.meta.env.VITE_GOONG_API_KEY; 

      if (value.length > 1) { // Bắt đầu tìm kiếm khi có ít nhất 2 ký tự 
        fetch(`https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${e.target.value}`) 
          .then(response => response.json()) 
          .then(data => { 
            setSuggestions(data.predictions);
            setShowSuggestions(true); 
          }) 
          .catch(error => { 
            console.error('Error fetching autocomplete suggestions:', error); 
          }); 
        } else {
           setSuggestions([]); 
           setShowSuggestions(false);
          } 
        } else {
          setFormData({ ...formData, [name]: value });
        }
      };

    const handleSuggestionClick = (suggestion) => { 
      console.log('Selected suggestion:', suggestion); 
      setFormData({...formData, location: suggestion.description});
      setQuery(suggestion.description);
      setShowSuggestions(false)
    };

    const handleBudgetClick = (budget) => {
      console.log('Selected budget:', budget);
      setFormData({ ...formData, budget: budget.title });
    };

    const handlePeopleClick = (people) => {
      console.log('Selected people:', people);
      setFormData({ ...formData, people: people.people });
    };

    useEffect(() => { 
      console.log(formData); 
    }, [formData]);

    const login = useGoogleLogin({
      onSuccess:(codeResp) => GetUserProfile(codeResp),
      onError:(error) => console.log(error)
    });

    const OnGenerateTrip= async() => {

      const user = localStorage.getItem('user');

      if (!user){
        setOpenDialog(true);
        return;
      }
        

      if (!formData.location||!formData?.travelDays||!formData?.budget||!formData?.people)
      {
        toast("Please fill in all information")
        return ;
      }
      setLoading(true);
      const FINAL_PROMPT=AI_PROMPT
      .replace('{location}', formData?.location)
      .replace('{people}', formData?.people)
      .replace('{budget}', formData?.budget)
      .replace('{travelDays}', formData?.travelDays)

      //console.log(FINAL_PROMPT);

      const result = await chatSession.sendMessage(FINAL_PROMPT);

      console.log("---",result?.response?.text());
      setLoading(false);
      SaveAiTrip(result?.response?.text());
    };

    const SaveAiTrip = async(TripData) => {

      setLoading(true);
      const docId = Date.now().toString();
      const user = JSON.parse(localStorage.getItem('user'));

      await setDoc(doc(db, "TravelAdvisor", docId), {
        userSelection: formData,
        tripData: JSON.parse(TripData),
        userEmail: user?.email,
        id: docId
      });
      setLoading(false);
      navigate('/view-trip/'+docId);
    };

    const GetUserProfile = (tokenInfo) => {
      axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`,
      {
        headers:{
          Authorization:`Bearer ${tokenInfo?.access_token}`,
          Accept:'Application/json'
        }
      }).then((resp) => {
        console.log(resp);
        localStorage.setItem('user', JSON.stringify(resp.data));
        setOpenDialog(false);
        OnGenerateTrip();
      })
    };

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
      <h2 className='font-bold text-3xl'>Tell us your preferences 🏕️ 🏖️</h2>
      <p className='mt-3 text-gray-500 text-xl'>Just provide some basic information and we will suggest you a suitable trip based on your preferences</p>
    
      <div className='mt-20 flex flex-col gap-10'>
        <div>
          <h2 className='text-xl my-3 font-medium'>What is your destination?</h2>
          {/* <GooglePlacesAutocomplete
            apiKey={import.meta.env.VITE_GOOGLE_PLACE_API_KEY}
          /> */}
          <Input 
            type="text" 
            name="query"
            value={query}
            onChange={handleInputChange} 
            placeholder="Start typing to search places..." 
          /> 
          { showSuggestions && (         
            <table className="min-w-full bg-white border border-gray-300 shadow-md"> 
              <tbody> 
                {suggestions.map((suggestion, index) => ( 
                <tr 
                  key={index} 
                  className="hover:bg-teal-100"
                  onClick={() => handleSuggestionClick(suggestion)}
                > 
                <td className="px-4 py-2 border-b border-gray-100">
                  {suggestion.description}
                </td> 
                </tr> 
                ))} 
              </tbody> 
            </table>
          )} 
        </div>

        <div>
          <h2 className='text-xl my-3 font-medium'>How many days are you planning?</h2>
          <Input name = "travelDays" placeholder={'Ex.3'} type="number" min="0" 
            onChange={handleInputChange}
          />
        </div>

        <div>
          <h2 className='text-xl my-3 font-medium'>Choose your budget</h2>
          <div className='grid grid-cols-3 gap-5 mt-5'>
            {SelectBudgetOptions.map((item, index) => (
              <div key={index} 
              onClick={() => handleBudgetClick(item)}
              className={`p-4 border cursor-pointer rounded-lg hover:shadow-lg 
                ${formData.budget == item.title && 'shadow-lg border-black'}
              `}>
                <h2 className='text-4xl'>{item.icon}</h2>
                <h2 className='font-bold text-lg'>{item.title}</h2>
                <h2 className='text-sm text-gray-500'>{item.desc}</h2>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className='text-xl my-3 font-medium'>Choose the members for your journey </h2>
          <div className='grid grid-cols-3 gap-5 mt-5'>
            {SelectTravelList.map((item, index) => (
              <div key={index} 
              onClick={() => handlePeopleClick(item)}
              className={`p-4 border cursor-pointer rounded-lg hover:shadow-lg 
                ${formData.people == item.people && 'shadow-lg border-black'}
              `}>
                <h2 className='text-4xl'>{item.icon}</h2>
                <h2 className='font-bold text-lg'>{item.title}</h2>
                <h2 className='text-sm text-gray-500'>{item.desc}</h2>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='my-10 justify-end flex'>
        <Button disabled={loading} onClick={OnGenerateTrip}>
          {loading? <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' />:'Generate Trip'}
        </Button>
      </div>

      <Dialog open={openDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogDescription>
              <img src='/logo.svg'/>
              <DialogTitle className='font-bold text-lg mt-7'>Choose a login method</DialogTitle>
              <Button 
                onClick = {login}
                className="w-full mt-5 flex gap-4 items-center">
                <FcGoogle className='h-7 w-7' />
                Sign in with Google
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>


    </div>

  )
  }


export default CreateTrip


