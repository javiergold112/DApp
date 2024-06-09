import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateCampaign } from './store/campaignSlice';

import { useNavigate, useParams } from 'react-router-dom';

import { Editor } from '@tinymce/tinymce-react';

// Components
import DashContent from './components/micro/DashContent';
import { FileInput, DragNDrop, KeywordsInput, DateTimePicker, Dropdown } from './components/micro/FormComponents';

import CampaignFields from './components/CampaignFields';

import { ModalContext } from './context/ModalContext';
import { PageHeader } from './components/PageHeader';
import { getInitialNft } from './store/nftSlice';
import { ApiAxios } from './api/Api';
import { getKeywordById } from './api';
import { getQuestionById, listQuestions } from './api/requests/Questions';

const EditCampaign = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const editorRef = useRef(null);

  const allNfts = useSelector((state) => state.nft.nfts);
  const user = useSelector((state) => state.auth?.value?.user);

  const { id } = useParams(),
        [changedData, setChangedData] = useState(null),
        [errorBaner, setErrorBaner] = useState(''),
        [errorLogo, setErrorLogo] = useState(''),
        [campaignData, setCampaignData] = useState(null),
        [availableNFT, setAvailableNFT] = useState([]),
        [formErrors, setFormErrors] = useState([]),
        [nftId, setNftId] = useState('');
  const [nftSlug, setNftSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [date, setDate] = useState(new Date());
  const [cover, setCover] = useState(null);
  const [logo, setLogo] = useState(null);

  const [fieldsErrors, setFieldsErrors] = useState([]);
  const [fields, setFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [availableFieldsForDropdown, setAvailableFieldsForDropdown] = useState([
    { _id: 'noId', question: 'First select a category' },
  ]);
  const [categoryToAdd, setCategoryToAdd] = useState(null);
  const [fieldToAdd, setFieldToAdd] = useState(null);
  const [fieldToAddDefaultValue, setFieldToAddDefaultValue] = useState(null);

  const { setContent, handleOpen } = useContext(ModalContext);

  useEffect(() => {
    dispatch(getInitialNft({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCategory = (category) => {
    if (category) {
      setCategoryToAdd(category);
      setAvailableFieldsForDropdown(availableFields[category]);
      setFieldToAddDefaultValue(availableFields[category][0]?.question);
    } else {
      setAvailableFieldsForDropdown([{ _id: 'noId', question: 'First select a category' }]);
      setCategoryToAdd(null);
      setFieldToAdd(null);
    }
    console.log("AvailableFieldsForDropdown=>", availableFields[category]);
  };



  const getImageFields = async (url, type) => {
    try {
      const currentCover = await fetch(url);
      const blob = await currentCover.blob();
      if (type === 'cover') setCover(blob);
      if (type === 'logo') setLogo(blob);
    } catch (e) {
      console.log(e);
    }
  };

  const fieldsChangeHandler = (id, row) => {
    const tempData = fields.map((item) => {
      if (item._id === id) {
        return {
          ...item,
          ...row,
        };
      } else {
        return item;
      }
    });
    setFields(tempData);
  };

  const addField = () => {
    if (categoryToAdd && fieldToAdd) {
      getQuestionById(fieldToAdd)
        .then((res) => {
          let category = availableFields[categoryToAdd].filter((field) => field._id !== res.question._id);
          if (category) {
            availableFields[categoryToAdd] = category;
          } else {
            setAvailableFields(availableFields.filter((fields, categ) => categ !== categoryToAdd));
          }
          setFields((prevState) => [...prevState, res.question]);
          handleAddCategory(null);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const removeField = (id) => {
    const fieldToRemove = fields.find((item) => item._id === id);
    setFields(fields.filter((item) => item._id !== id));

    if (availableFields[fieldToRemove.categoryLabel]) {
      let category = availableFields[fieldToRemove.categoryLabel];
      availableFields[fieldToRemove.categoryLabel] = [...category, fieldToRemove];
    } else {
      availableFields[fieldToRemove.categoryLabel] = [fieldToRemove];
    }
  };

  const inputChangeHandler = (e) => {
    if (e.target.name === 'slug') {
      const { value } = e.target;
      const tempValue = value.replace(/[^A-Z]+/gi, '-').toLowerCase();
      setNftSlug(tempValue);
      setChangedData({
        ...changedData,
        slug: tempValue,
      });
    }
    setCampaignData({
      ...campaignData,
      [e.target.name]: e.target.value,
    });
    setChangedData({
      ...changedData,
      [e.target.name]: e.target.value,
    });
  };

  const onSubmit = (type) => {
    let tempErrors = [];
    const tempFields = fields.map((item) => {
      return {
        id: item._id,
        required: item.categoryLabel === 'forceRequired' || item.required,
      };
    });

    const fieldsErrors = fields.filter((field) => {
      return (field.type === 'dropdown' && field.options.length === 0) || field.placeholder === '';
    });

    setFieldsErrors(fieldsErrors);

    let tempData = {
      ...changedData,
      _id: campaignData._id,
      user_id: campaignData.user_id,
      content: editorRef.current.getContent(),
      keywords: keywords,
      fields: tempFields,
      status: 'draft',
      removeCover: false,
      removeLogo: false,
      nft_id: nftId,
    };

    if (typeof logo !== Blob) {
      tempData = {
        ...tempData,
        removeLogo: true,
      };
    }

    if (typeof cover !== Blob) {
      tempData = {
        ...tempData,
        removeCover: true,
      };
    }

    if (!campaignData.name) {
      tempErrors.push('name');
    }
    if (tempData.slug === '') {
      tempErrors.push('slug');
    }
    if (!campaignData.title && !changedData.title && type !== 'save') {
      tempErrors.push('title');
    }
    if (tempData.keywords.length === 0 && type !== 'save') {
      tempErrors.push('keywords');
    }
    if (!campaignData.cover && !changedData.cover && type !== 'save') {
      tempErrors.push('cover');
    }
    if (!campaignData.logo && !changedData.logo && type !== 'save') {
      tempErrors.push('logo');
    }
    if (!campaignData.content && !changedData.content && type !== 'save') {
      tempErrors.push('content');
    }
    if ((!tempData.nft_id || tempData.nft_id === '') && type !== 'save') {
      tempErrors.push('nft_id');
    }

    if (type === 'preview'&&!tempErrors.includes('name')&&!tempErrors.includes('slug')&&!tempErrors.includes('title')&&!tempErrors.includes('keywords')&&!tempErrors.includes('cover')&&!tempErrors.includes('logo')&&!tempErrors.includes('content')) {
      console.log('update', tempData);
      dispatch(updateCampaign({ campaign: tempData, type: 'draft' }));
      window.open(`${window.location.origin}/auth/register/campaign/${nftSlug}`, '_blank');
    }

    setFormErrors(tempErrors);
    if (tempErrors.length === 0 && fieldsErrors.length === 0) {
      if (type === 'save') {
        dispatch(updateCampaign({ campaign: tempData, type: 'draft' }));
        navigate('/dashboard/campaigns', {
          state: {
            currentTab: 'draft',
          },
        });
      }
      if (type === 'validate' && (user.kyb_passed || user.is_superadmin)) {
        dispatch(updateCampaign({ campaign: tempData, type: 'adminApproval' }));
        navigate('/dashboard/campaigns', {
          state: {
            currentTab: 'draft',
          },
        });

        handleOpen();
        setContent(
          <div className='create-create-compagn-modal'>
            <p>We appreciate your submission.<br/>
              Our team will review your campaign and will quickly notify you by email once it has been approved.</p>
          </div>
        );
      }
    } else {
      if (tempErrors.length >= 2) {
        const element = document.getElementById('scroll-error-field');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {

        if (tempErrors.includes('nft_id')) {
          const element = document.getElementById('nft-place');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }

    }
  };

  const handleCheckSlug = async () => {
    try {
      await ApiAxios.get('/campaigns/slugCheck', {
        params: {
          slug: nftSlug,
        },
      });

      setSlugAvailable(true);
    } catch (err) {
      setSlugAvailable(false);
      setFormErrors([...formErrors, 'slug']);
    }
  };

  const handleDragNDrop = (file, type) => {
    setCampaignData({
      ...campaignData,
      [type]: file,
    });
    setChangedData({
      ...changedData,
      [type]: file,
    });
  };

  useEffect(() => {
    const loadCampaign = async () => {
      const { data } = await ApiAxios.get(`/campaigns/${id}`);
      const tempCampaign = data;
      setCampaignData(tempCampaign);
      if (tempCampaign.ends_at) setDate(new Date(tempCampaign.ends_at));
      if (tempCampaign.keyword_ids.length > 0) {
        for (let id of tempCampaign.keyword_ids) {
          getKeywordById(id)
            .then((res) => {
              setKeywords((prevState) => [...prevState, res.keyword.word]);
            })
            .catch((err) => {
              console.log(err);
            });
        }
      }
      if (tempCampaign && tempCampaign.fields !== null) {
        listQuestions()
          .then((res) => {
            let fieldIds = [];
            tempCampaign.fields.map((item) => {
              fieldIds = [...fieldIds, item.id];
              getQuestionById(item.id)
                .then((quest) => {
                  quest.question.required = item.required;
                  setFields((prevState) => [...prevState, quest.question]);
                })
                .catch((err) => {
                  console.log(err);
                });
            });

            res.list.map((item) => {
              if (!fieldIds.includes(item._id)) {
                if (availableFields[item.categoryLabel]) {
                  let category = availableFields[item.categoryLabel];
                  availableFields[item.categoryLabel] = [...category, item];
                } else {
                  availableFields[item.categoryLabel] = [item];
                }
              }
            });
            handleAddCategory(null);
          })
          .catch((err) => {
            console.log(err);
          });
      }
      if (tempCampaign.slug) setNftSlug(tempCampaign.slug);
      if (tempCampaign.cover !== '') {
        await getImageFields(`${process.env.REACT_APP_API}/uploads/${tempCampaign.cover}`, 'cover');
      }
      if (tempCampaign.logo !== '') {
        await getImageFields(`${process.env.REACT_APP_API}/uploads/${tempCampaign.logo}`, 'logo');
      }
      if (tempCampaign.nft_id !== '') {
        setNftId(tempCampaign.nft_id);
      }
    };

    loadCampaign();
  }, []);

  useEffect(() => {
    if (campaignData && campaignData._id) {
      const tempNFTS = allNfts.filter(
        (item) => (item.status !== 'draft' && !item.campaign) || item.campaign_id === campaignData._id
      );
      setAvailableNFT(tempNFTS);
    }
  }, [allNfts, campaignData]);

  const datePickerHandler = (date) => {
    setDate(date);
    setChangedData({
      ...changedData,
      date,
    });
  };

  const nftIdHandler = (id) => {
    console.log('id ::', id);
    setNftId(id);
    setChangedData({
      ...changedData,
      nft_id: id,
    });
  };

  const campaignCounts = useSelector((state) => state.dashboard.counts.campaigns);
  const tabs = {
    edit: {
      name: 'Edit Campaign',
      hidden: true,
    },
    draft: {
      title: 'DRAFT CAMPAIGN',
      name: 'Draft Campaign',
      onClick: () => {
        navigate('/dashboard/campaigns', {
          state: {
            currentTab: 'draft',
          },
        });
      },
      count: campaignCounts.draft,
    },
    live: {
      title: 'LIVE CAMPAIGN',
      name: 'Live Campaign',
      onClick: () => {
        navigate('/dashboard/campaigns', {
          state: {
            currentTab: 'live',
          },
        });
      },
      count: campaignCounts.live,
    },
    whitelisted: {
      title: 'WHITELISTED CAMPAIGNS',
      name: 'Whitelist results',
      onClick: () => {
        navigate('/dashboard/campaigns', {
          state: {
            currentTab: 'whitelisted',
          },
        });
      },
      count: campaignCounts.whitelisted,
    },
  };

  return (
    <main className="main">
      <PageHeader tabs={tabs} currentTab={'edit'} title={campaignData?.name} description={campaignData?.description} />

      <DashContent>
        {campaignData && (
          <div className="nft-content">
            <div className="container">
              <div className={'formik-form'}>
                <div className={'inputs-two-cells'} id="scroll-error-field">
                  <div className={'input-wrapper'}>
                    <label htmlFor={'name'}>
                      {'Campaign Name'}
                      <span className="required-indicator">*</span>
                    </label>
                    <input
                      value={campaignData.name && campaignData.name}
                      type={'text'}
                      id={'name'}
                      name={'name'}
                      onChange={inputChangeHandler}
                    />
                    {formErrors.includes('name') && <p className={'general-error'}>Campaign name is mandatory</p>}
                  </div>
                  <div className={'input-wrapper'}>
                    <label htmlFor={'slug'}>
                      {'Campaign Slug'}
                      <span className="required-indicator">*</span>
                    </label>
                    <input
                      type={'text'}
                      id={'slug'}
                      name={'slug'}
                      value={`${nftSlug}`}
                      onChange={inputChangeHandler}
                      onBlur={() => handleCheckSlug()}
                    />
                    {formErrors.includes('slug') && <p className={'general-error'}>Campaign slug is mandatory</p>}
                    {slugAvailable && <p className={'general-success'}>Campaign slug is available</p>}
                  </div>
                </div>

                <div className={'inputs-two-cells'}>
                  <div className={'input-wrapper'}>
                    <label htmlFor={'title'}>
                      {'Campaign Title'}
                      <span className="required-indicator">*</span>
                    </label>
                    <input
                      value={campaignData.title && campaignData.title}
                      type={'text'}
                      id={'title'}
                      name={'title'}
                      onChange={inputChangeHandler}
                    />
                    {formErrors.includes('title') && <p className={'general-error'}>Campaign title is mandatory</p>}
                    <p className="field-info">This title will show under your banner</p>
                  </div>
                  <div className={'input-wrapper'}>
                    <label htmlFor={'title'}>
                      {'Project website'}
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={'text'}
                        id={'website'}
                        name={'website'}
                        onChange={inputChangeHandler}
                        value={campaignData.website && campaignData.website}
                      />
                    </div>
                    {formErrors.includes('website') && <p className={'general-error'}>Campaign website is mandatory</p>}
                    <p className="field-info">This field should not be a Twitter or Discord web address</p>
                  </div>
                </div>
                <div className={'inputs-two-cells'}>
                  <div>
                    <label htmlFor={'keywords'}>
                      {'Campaign keywords'}
                      <span className="required-indicator">*</span>
                    </label>
                    <KeywordsInput state={keywords} setState={setKeywords} />
                    {formErrors.includes('keywords') && (
                      <p className={'general-error'}>Campaign keywords are mandatory</p>
                    )}
                  </div>
                  <div className={'input-wrapper'}>
                    <label htmlFor={'title'}>
                      {'Campaign End Time'}
                      <span className="required-indicator">*</span>
                    </label>
                    <DateTimePicker setDate={datePickerHandler} date={date} minDate={new Date()} />
                  </div>
                </div>
                <div style={{ alignItems: 'flex-start' }} className={'inputs-two-cells'}>
                  <div className={'inputs-one-cell'}>
                    <FileInput
                      fieldName={'cover'}
                      required
                      label={'Campaign Banner'}
                      accept={'image/png, image/jpeg'}
                      buttonText={'Add banner ( Jpeg or png )'}
                      onChange={(event) => {
                        const extension = event.currentTarget.files[0].name.split('.').pop();
                        if(extension === "png" || extension === "jpeg" || extension === "jpg"){
                          setErrorBaner('');
                          setCover(event.currentTarget.files[0]);
                          setChangedData({
                            ...changedData,
                            cover: event.currentTarget.files[0],
                          });
                        }else{
                          setErrorBaner('Uploading this file is not allowed')
                        }
                      }}
                      file={changedData ? changedData.cover : null}
                      edit={campaignData.cover}
                    />
                    <p className="field-info">
                      This will go at the top of the project page as a header. We recommend 1400x300.
                    </p>
                    <DragNDrop
                      fileTypes={['JPG', 'PNG', 'JPEG']}
                      handleChange={(file) => handleDragNDrop(file, 'logo')}
                      file={cover}
                    />
                    {cover && (
                      <button type={'button'} className={'action-button secondary'} onClick={() => setCover(null)}>
                        Remove image
                      </button>
                    )}
                    {formErrors.includes('cover') && <p className={'general-error'}>Campaign banner is mandatory</p>}
                    {errorBaner ? <p className={'general-error'}>{errorBaner}</p> : null}
                  </div>
                  <div className={'inputs-one-cell'}>
                    <FileInput
                      fieldName={'logo'}
                      required
                      label={'Campaign Logo'}
                      accept={'image/png, image/jpeg'}
                      buttonText={'Add logo ( Jpeg or png )'}
                      onChange={(event) => {
                        const extension = event.currentTarget.files[0].name.split('.').pop();
                        if(extension === "png" || extension === "jpeg" || extension === "jpg"){
                          setErrorLogo('');
                          setLogo(event.currentTarget.files[0]);
                          setChangedData({
                            ...changedData,
                            logo: event.currentTarget.files[0],
                          });
                        }else{
                          setErrorLogo('Uploading this file is not allowed')
                        }
                      }}
                      file={changedData ? changedData.logo : null}
                      edit={campaignData.logo}
                    />
                    <p className="field-info">This will be shown as the logo of your campaign. We recommend 500x500</p>
                    <DragNDrop
                      fileTypes={['JPG', 'PNG', 'JPEG']}
                      handleChange={(file) => handleDragNDrop(file, 'logo')}
                      file={logo}
                    />
                    {logo && (
                      <button type={'button'} className={'action-button secondary'} onClick={() => setLogo(null)}>
                        Remove image
                      </button>
                    )}
                    {formErrors.includes('logo') && <p className={'general-error'}>Campaign logo is mandatory</p>}
                    {errorLogo ? <p className={'general-error'}>{errorLogo}</p> : null}
                  </div>
                </div>
                <div className={'inputs-one-cell'}>
                  <h3 style={{ marginBottom: '10px' }}>
                    Description<span className="required-indicator">*</span>
                  </h3>

                  <Editor
                    apiKey="nt6aaz1i9ea2zhdq10qljv6u3r44pp32rcl4dqpltzsezord"
                    onInit={(evt, editor) => (editorRef.current = editor)}
                    initialValue={campaignData.content}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: [
                        'advlist',
                        'autolink',
                        'lists',
                        'link',
                        'image',
                        'charmap',
                        'preview',
                        'anchor',
                        'searchreplace',
                        'visualblocks',
                        'fullscreen',
                        'insertdatetime',
                        'media',
                        'table',
                        'wordcount',
                      ],
                      toolbar:
                        'undo redo fontfamily fontsize | ' +
                        'forecolor bold italic | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | image link fullscreen',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
                      lists_indent_on_tab: false,
                      font_formats:
                        'Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats',
                      branding: false,
                      font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt',
                      file_picker_callback: function (cb, value, meta) {
                        var input = document.createElement("input");
                        input.setAttribute("type", "file");
                        input.setAttribute("accept", "image/*");
                        input.onchange = function () {
                          var file = this.files[0];
          
                          var reader = new FileReader();
                          reader.onload = function () {
                            var id = "blobid" + new Date().getTime();
                            var blobCache = editorRef.current.editorUpload.blobCache;
                            var base64 = reader.result.split(",")[1];
                            var blobInfo = blobCache.create(id, file, base64);
                            blobCache.add(blobInfo);
          
                            /* call the callback and populate the Title field with the file name */
                            cb(blobInfo.blobUri(), { title: file.name });
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }
                    }}
                  />

                  {formErrors.includes('content') && (
                    <p className={'general-error'}>Campaign description is mandatory</p>
                  )}
                </div>
                <div className={'inputs-one-cell'} id="nft-place">
                  <Dropdown
                    label={'Select your NFT'}
                    options={availableNFT}
                    value={nftId}
                    setOption={nftIdHandler}
                    property={'name'}
                  />
                  {formErrors.includes('nft_id') && <p className={'general-error'}>NFT is mandatory</p>}
                </div>
              </div>
              <div className="formik-form">


                <h3 className='mt-4 title-collect-data'>Datas you want to collect</h3>
                <div className={'inputs-two-cells inputs-two-cells-datas'}>
                  <CampaignFields
                    fields={fields}
                    fieldsChangeHandler={fieldsChangeHandler}
                    removeField={removeField}
                    fieldsErrors={fieldsErrors}
                    setField={setFields}
                  />
                </div>

                <div className="add-new-datas" style={{ marginTop: '0.3rem' }}>
                  <h3>Add new Datas</h3>
                  {Object.keys(availableFields).length > 0 && (
                    <>
                      <div className={'add-new-options mx-auto'}>
                        <div className={'d-flex'}>
                          <div className={'input-wrapper'}>
                            <Dropdown
                              label={false}
                              name={'category_to_add'}
                              options={Object.keys(availableFields)}
                              value={categoryToAdd}
                              setOption={handleAddCategory}
                              defaultValue={'Category'}
                              property={null}
                            />
                          </div>
                          <div className={'input-wrapper select-two'}>
                            <Dropdown
                              label={false}
                              name={'field_to_add'}
                              options={availableFieldsForDropdown}
                              value={fieldToAdd}
                              defaultValue={
                                availableFieldsForDropdown[0]?._id === 'noId'
                                  ? 'First Select a Category'
                                  : fieldToAddDefaultValue
                              }
                              setOption={setFieldToAdd}
                              property={'question'}
                            />
                          </div>
                        </div>
                      </div>
                      <button onClick={addField} className={'action-button'}>
                        Add selected field
                      </button>
                    </>
                  )}
                </div>
                <div className={'form-footer'}>
                  <button
                    type="button"
                    onClick={() => {
                      onSubmit('preview');
                    }}
                    className="action-button outlined"
                  >
                    <span>Click here to preview your campaign</span>
                  </button>
                </div>
                <div className={'form-footer'}>
                  <button onClick={() => onSubmit('save')} className={'action-button secondary'}>
                    {'Save'}
                  </button>
                  <button
                    disabled={!user.kyb_passed && !user.is_superadmin}
                    onClick={() => onSubmit('validate')}
                    className={'action-button primary'}
                    type="submit"
                  >
                    {'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashContent>
    </main>
  );
};

export default EditCampaign;
